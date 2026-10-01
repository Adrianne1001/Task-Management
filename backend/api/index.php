<?php

/*
 * Vercel serverless entry point (vercel-php runtime).
 *
 * Every request is routed here by vercel.json and handed to Laravel's normal
 * front controller. Local and Docker setups never use this file.
 *
 * The script vars are reset first: with SCRIPT_NAME "/api/index.php", Symfony
 * treats "/api" as the base path and strips it, so "/api/projects" would be
 * routed as "/projects" and 404.
 */
$_SERVER['SCRIPT_FILENAME'] = __DIR__.'/../public/index.php';
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

require __DIR__.'/../public/index.php';
