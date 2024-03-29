// Set root URLs
var rootURL = "https://diggsml.org/def/codes/DIGGS/";

//Set the properties version to query
var propvers = 0.1;

//In the future, add dropdowns to select versions

// Declare list array to hold codelist info
var dictArray = new Array();

//Set array counter
var dictCnt = 0;

//Declare variable to hold the html
var txt = "";

//construct the api URL for dictionary repository
var dictapi =
  "https://api.github.com/repos/diggsml/def/contents/docs/codes/DIGGS/" +
  propvers;

//Start main function
main();

/* ------------------------------------------------------------------------------------------*/

//All the magic happens here
async function main() {
  // Fill the dictArray with codelist info
  // Run the Github API to return contents of the repository where property dictionaries occur
  let repoObject = await fetch(dictapi);
  let repoJson = await repoObject.json();

  // Now loop through the dictionary files
  for (let filerec of repoJson) {
    var url = rootURL + propvers + "/" + filerec.name;

    //Go fetch the dictionary file
    //Fetch the file
    let dictObject = await fetch(url);
    let dictText = await dictObject.text();

    //Parse dictText into XML DOM object
    const dictObj = new window.DOMParser().parseFromString(
      dictText,
      "text/xml"
    );

    // Get the dictionary id - this is the source element name (the element that holds the code);
    var dict = dictObj.getElementsByTagName("gml:Dictionary");

    //Check to make sure that it's a dictionary file
    if (dict.length == 0) continue;
    var id = dict[0].attributes.getNamedItem("gml:id").nodeValue;

    //The dictionary description and name should be the first and third child elements. respectively
    var description = dict[0].firstElementChild.childNodes[0].nodeValue;
    var name =
      dict[0].firstElementChild.nextElementSibling.nextElementSibling
        .childNodes[0].nodeValue;

    //Populate object string
    var objStr = {
      id: `${id}`,
      name: `${name}`,
      description: `${description}`,
      file: `${filerec.name}`,
      url: `${url}`
    };

    //Fill Array
    dictArray[dictCnt] = objStr;
    dictCnt++;
  }

  dictArray.sort((a, b) => {
    let fa = a.name.toLowerCase(),
      fb = b.name.toLowerCase();
    if (fa < fb) {
      return -1;
    }
    if (fa > fb) {
      return 1;
    }
    return 0;
  });

  //Now that we've collected all of the Procedure information, call function to write out html and then stop
  writeHtml();
}

/* ------------------------------------------------------------------------------------------*/

function writeHtml() {
  txt +=
    '<div><div class="logo"><img src= "https://diggsml.org/def/img/diggs-logo.png" style="width:150px"/></div>';
  txt +=
    "<h1>DIGGS Codelist and Property Dictionaries<br/>Version " +
    propvers +
    "</h1></div>";

  //Write table
  tableBody(dictArray);

  //Add footer
  txt +=
    '<div style="font-size:0.8em; font-family:arial; text-align: center;">';
  txt +=
    '<div style="border: 0px #333366 double; text-align: center; margin: 1em auto; padding: 2px; width: 99%;">';
  txt +=
    '<a href="https://diggsml.org">https://diggsml.org</a> is the official domain name for the <a href="https://diggsml.org">DIGGS project</a>, a data interchange standard for the geotechnical and geoenvironmental community.<br/>';
  txt +=
    'DIGGS is a Special Project of the <a href="https://www.geoinstitute.org/">Amerian Society of Civil Engineers Geo-Institute (G-I)</a>. All rights reserved.';
  txt += "</div></div>";

  document.getElementsByTagName("body")[0].innerHTML = txt;
}

/* ------------------------------------------------------------------------------------------*/

function tableBody(content) {
  txt += '<table class="fixed_header">';
  txt += "<tr>";
  txt += "<th>Dictionary Name</th>";
  txt += "<th>Description</th>";
  txt += " <th>Source Element</th>";
  txt += " <th>Dictionary File</th>";
  txt += "</tr>";

  //Loop through the array to populate cells
  for (i = 0; i < content.length; i++) {
    txt += '<tr><td class="center">';
    txt += content[i].name;
    txt += "</td>";
    txt += "<td>" + content[i].description + "</td>";
    txt += '<td class="center">' + content[i].id + "</td>";
    txt +=
      '<td class="center"><a href = "' +
      content[i].url +
      '" target = "_blank">' +
      content[i].file +
      "</a></td>";
    txt += "</tr>";
  }
  txt += "</table>";
}