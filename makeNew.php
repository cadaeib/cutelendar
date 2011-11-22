<?php
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

// load calendar name and hash.
$calname = $_POST["calname"];
$hash = $_POST["hash"];


$searchquery = "SELECT * FROM cutelendar WHERE calname = '". $calname ."'";
$data = mysql_query($searchquery) or die(mysql_error());
$row = mysql_fetch_array($data);

// if it isn't already there...	
if ($row == FALSE) {
	// add it!
	$insertquery = "INSERT INTO cutelendar (calname, hash) VALUES('" . mysql_real_escape_string($calname) . "', '" . mysql_real_escape_string($hash) . "')";
	mysql_query($insertquery);
	
}
// otherwise, error.
else {
	echo "Error: something with this name already exists";
}
?>