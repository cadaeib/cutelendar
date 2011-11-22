<?php
// okay, leave this for later... right now we're doing the wimpy little text file thing.
define("DB_LOCATION", "localhost");
define("DB_NAME","amyzhou");
define("DB_USER", "amyzhou");
define("DB_PASSWORD", "mysql");

//FUNCTION: Connect to the MySQL server and select the appropriate database 
function connect_and_select(){ 
// Connect to the server: 
$db_connection = mysql_connect(DB_LOCATION, DB_USER, DB_PASSWORD); 
// In the event of database connection failure, halt execution and display error information: 
if(!$db_connection){die("Database connection error: ".mysql_error()."");} $db_select = mysql_select_db(DB_NAME); 
// In the event of database selection failure, halt execution and display error information: 
if(!$db_select){die("Database selection error: ".mysql_error()."");} 
// Return the connection handle so that it can be closed using mysql_close("$db_connection") 
return ($db_connection); }

$link = connect_and_select();
$calname = $_GET["calname"];
$hash = $_GET["hash"];
$query = "SELECT * FROM cutelendar WHERE calname = '" . $calname . "'";
$data = mysql_query($query) or mysql_error();
$row = mysql_fetch_array( $data );
$passbit = (check_pass($calname, $hash)) ? 1 : 0;
echo "[" . $row['list'].", ".$row['settings'] . ", " . $passbit . "]";

?>
