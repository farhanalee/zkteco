<?php
/**
 * ZKTeco K40 Attendance System - Index Router
 */

require_once __DIR__ . '/../app/auth.php';

use App\Auth;

if (Auth::check()) {
    header('Location: /zkteco/public/dashboard.php');
} else {
    header('Location: /zkteco/public/login.php');
}
exit;
