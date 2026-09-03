<?php
/**
 * ZKTeco K40 Attendance System - Employees API Endpoint
 * Handles fetching, adding, updating, and deleting employees from physical K40 hardware.
 * Supports shift assignments and employment types stored in local config.
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/connector.php';
require_once __DIR__ . '/../../app/security.php';

use App\Auth;
use App\Config;
use App\ConnectorClient;

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'UNAUTHORIZED',
        'message' => 'Please log in to manage employees.'
    ]);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$connector = new ConnectorClient();

// Load local employee metadata (shift assignments, employment types)
$employeeMeta = Config::get('employee_meta', []);

try {
    switch ($action) {
        case 'list':
            $result = $connector->getUsers();
            if (!($result['success'] ?? false)) {
                http_response_code(400);
                echo json_encode($result);
                break;
            }

            // Merge device users with local metadata (shift_id, employment_type, department)
            $deviceUsers = $result['data'] ?? [];
            $shifts = Config::get('shifts', []);
            $departments = Config::get('departments', []);
            $shiftAssignments = Config::get('shift_assignments', ['employee_shifts' => [], 'temporary_overrides' => []]);

            foreach ($deviceUsers as &$user) {
                $meta = $employeeMeta[$user['user_id']] ?? [];

                // Permanent shift assignment
                $user['shift_id'] = $meta['shift_id'] ?? ($shiftAssignments['employee_shifts'][$user['user_id']] ?? null);

                // Employment type
                $user['employment_type'] = $meta['employment_type'] ?? 'permanent';

                // Department
                $user['department_id'] = $meta['department_id'] ?? null;
                if ($user['department_id']) {
                    $dept = array_values(array_filter($departments, fn($d) => $d['id'] === $user['department_id']));
                    $user['department_name'] = $dept[0]['name'] ?? $user['department_id'];
                }

                // Designation
                $user['designation_id'] = $meta['designation_id'] ?? null;
                if ($user['designation_id']) {
                    $designations = Config::get('designations', []);
                    $desig = array_values(array_filter($designations, fn($d) => $d['id'] === $user['designation_id']));
                    $user['designation_title'] = $desig[0]['title'] ?? $user['designation_id'];
                }
            }
            unset($user);

            $result['data'] = $deviceUsers;
            echo json_encode($result);
            break;

        case 'save':
        case 'add':
        case 'create':
            $userData = [
                'uid' => intval($input['uid'] ?? $input['user_id'] ?? 1),
                'user_id' => strval($input['user_id'] ?? ''),
                'name' => trim($input['name'] ?? ''),
                'privilege' => intval($input['privilege'] ?? 0),
                'password' => strval($input['password'] ?? ''),
                'card' => intval($input['card'] ?? 0)
            ];

            if (empty($userData['user_id']) || empty($userData['name'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'VALIDATION_ERROR',
                    'message' => 'User ID and Employee Name are required.'
                ]);
                exit;
            }

            // Save to K40 device
            $result = $connector->saveUser($userData);
            if (!($result['success'] ?? false)) {
                http_response_code(400);
                echo json_encode($result);
                break;
            }

            // Save local metadata (shift, employment type, department, designation)
            $meta = $employeeMeta[$userData['user_id']] ?? [];
            $meta['shift_id'] = $input['shift_id'] ?? $meta['shift_id'] ?? null;
            $meta['employment_type'] = $input['employment_type'] ?? $meta['employment_type'] ?? 'permanent';
            $meta['department_id'] = $input['department_id'] ?? $meta['department_id'] ?? null;
            $meta['designation_id'] = $input['designation_id'] ?? $meta['designation_id'] ?? null;
            $employeeMeta[$userData['user_id']] = $meta;
            Config::set('employee_meta', $employeeMeta);

            // Also update shift_assignments.json for permanent shift assignments
            if (!empty($input['shift_id'])) {
                $shiftAssignments['employee_shifts'][$userData['user_id']] = $input['shift_id'];
                Config::set('shift_assignments', $shiftAssignments);
            }

            // Return merged user data
            $mergedUser = $userData;
            $mergedUser['shift_id'] = $meta['shift_id'];
            $mergedUser['employment_type'] = $meta['employment_type'];
            $mergedUser['department_id'] = $meta['department_id'];
            $mergedUser['designation_id'] = $meta['designation_id'];
            if ($mergedUser['department_id']) {
                $dept = array_values(array_filter($departments, fn($d) => $d['id'] === $mergedUser['department_id']));
                $mergedUser['department_name'] = $dept[0]['name'] ?? $mergedUser['department_id'];
            }
            if ($mergedUser['designation_id']) {
                $designations = Config::get('designations', []);
                $desig = array_values(array_filter($designations, fn($d) => $d['id'] === $mergedUser['designation_id']));
                $mergedUser['designation_title'] = $desig[0]['title'] ?? $mergedUser['designation_id'];
            }

            echo json_encode([
                'success' => true,
                'message' => 'Employee saved successfully',
                'data' => $mergedUser
            ]);
            break;

        case 'update_meta':
            // Update only local metadata (shift, employment type, department, designation) without writing to device
            $userId = strval($input['user_id'] ?? '');
            if (empty($userId)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'VALIDATION_ERROR',
                    'message' => 'User ID is required.'
                ]);
                exit;
            }

            $meta = $employeeMeta[$userId] ?? [];
            $meta['shift_id'] = $input['shift_id'] ?? $meta['shift_id'] ?? null;
            $meta['employment_type'] = $input['employment_type'] ?? $meta['employment_type'] ?? 'permanent';
            $meta['department_id'] = $input['department_id'] ?? $meta['department_id'] ?? null;
            $meta['designation_id'] = $input['designation_id'] ?? $meta['designation_id'] ?? null;
            $employeeMeta[$userId] = $meta;
            Config::set('employee_meta', $employeeMeta);

            // Update shift_assignments for permanent shift
            if (!empty($input['shift_id'])) {
                $shiftAssignments['employee_shifts'][$userId] = $input['shift_id'];
            } elseif (isset($input['shift_id']) && $input['shift_id'] === '') {
                unset($shiftAssignments['employee_shifts'][$userId]);
            }
            Config::set('shift_assignments', $shiftAssignments);

            echo json_encode([
                'success' => true,
                'message' => 'Employee metadata updated',
                'data' => $meta
            ]);
            break;

        case 'delete':
            $userId = strval($input['user_id'] ?? $_GET['user_id'] ?? '');
            if (empty($userId)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'VALIDATION_ERROR',
                    'message' => 'User ID is required for deletion.'
                ]);
                exit;
            }

            $result = $connector->deleteUser($userId);
            if (!($result['success'] ?? false)) {
                http_response_code(400);
                echo json_encode($result);
                break;
            }

            // Clean up local metadata
            unset($employeeMeta[$userId]);
            Config::set('employee_meta', $employeeMeta);
            unset($shiftAssignments['employee_shifts'][$userId]);
            Config::set('shift_assignments', $shiftAssignments);

            echo json_encode($result);
            break;

        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'INVALID_ACTION',
                'message' => "Unknown employee action: '{$action}'"
            ]);
            break;
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'SERVER_EXCEPTION',
        'message' => $e->getMessage()
    ]);
}
