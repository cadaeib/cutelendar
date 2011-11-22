<?php
function checkPass($calname, $hash){
	
$query = "SELECT FROM cutelendar WHERE calname = '" . $calname . "'";
$data = mysql_query($query) or die(mysql_error());
$row = mysql_fetch_array( $data );
if ($row['hash'] != "")
return ($row['hash'] == $hash);
}
?>