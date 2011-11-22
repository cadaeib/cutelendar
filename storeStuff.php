<?php

/* 
storeStuff.php

TAKES:

json object consisting of
	calname: calendar name
	list: list of cats
	settings: list of settings
	hash: hash of password

RETURNS:
error/success message

IS CALLED WHEN:
"save" is clicked with unchanged calname

 */
require 'checkPass.php';
 
define("DB_LOCATION", "localhost");
define("DB_NAME","amyzhou");
define("DB_USER", "amyzhou");
define("DB_PASSWORD", "mysql");

//FUNCTION: Connect to the MySQL server and select the appropriate database 
function connect_and_select(){ 
$db_connection = mysql_connect(DB_LOCATION, DB_USER, DB_PASSWORD); 
if(!$db_connection){die("Database connection error: ".mysql_error()."");} $db_select = mysql_select_db(DB_NAME); 
if(!$db_select){die("Database selection error: ".mysql_error()."");} 
return ($db_connection); }

$link = connect_and_select();

// load calendar name, settings, etc.
$calname = $_POST["calname"];
$list = $_POST["list"];
$settings = $_POST["settings"];
$hash = $_POST["hash"];

function check_exists($calname) {
$query = "SELECT * FROM cutelendar WHERE calname = '" . $calname . "'";
$data = mysql_query($query) or die(mysql_error());
return($data.length);
}

function check_pass($calname, $hash){
$query = "SELECT * FROM cutelendar WHERE calname = '" . $calname . "'";
$data = mysql_query($query) or die(mysql_error());
$row = mysql_fetch_array( $data );
//echo $row['hash'] . " should be " . $hash;
return ($row['hash'] == $hash);
}

if (check_pass($calname, $hash)) {
	// if it previously existed, delete it. 
	$query = "DELETE FROM cutelendar WHERE calname = '" . $calname . "'";
//	mysql_query($query) or die(mysql_error());

	$update = "UPDATE cutelendar SET list = '" . mysql_real_escape_string($list) . "', settings = '" . mysql_real_escape_string($settings) . "' WHERE calname = '" . mysql_real_escape_string($calname) . "'";
	$escaped = "INSERT INTO cutelendar (calname, list, settings) VALUES('" . mysql_real_escape_string($calname) . "', '" . mysql_real_escape_string($list) . "', '" . mysql_real_escape_string($settings) . "')";
	
	mysql_query($update) or die(mysql_error());
	
	echo "saved!";
} else {
	echo "wrong password";
}

?>
