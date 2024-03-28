// Set root URLs
//   var rootURL = "https://diggsml.org/schemas/";
var rootURL = "https://diggsml.org/schema-dev/";

// Set schema version to query
var version = 2.6;

//Set the properties version to query
var propvers = 0.1;

//In the future, add dropdowns to select versions

// Declare list arrays to hold procedure and result property info
var labProcedures = new Array();
var inSituProcedures = new Array();
var genericProcedures = new Array();
var modalTbl = new Array();
var propArray = new Array();

//Set array counter
var labcnt = 0;
var inscnt = 0;
var gencnt = 0;
var propCnt = 0;

//Declare variable to hold the html
var txt = "";

//construct the api URL for property repository
var propapi =
  "https://api.github.com/repos/diggsml/def/contents/docs/codes/DIGGS/" +
  propvers;

//Construct api URL for schema repository
//    var api =  "https://api.github.com/repos/diggsml/schemas/contents/"+ version;
var api = "https://api.github.com/repos/diggsml/schema-dev/contents/";

//Start main function
main();

/* ------------------------------------------------------------------------------------------*/

//All the magic happens here
async function main() {
  // First fill the propArray with properties info
  // Run the Github API to return contents of the repository where property dictionaries occur
  let repoObject = await fetch(propapi);
  let repoJson = await repoObject.json();

  // Now loop through the dictionary files to find the ones with test properties. Those files have "properties" in the name
  for (let filerec of repoJson) {
    if (filerec.name.indexOf("properties") >= 0) {
      //We've found a properties file

      //Now fetch that file
      var url =
        "https://diggsml.org/def/codes/DIGGS/" + propvers + "/" + filerec.name;

      //Go fetch the property file, In the future get all potential property dictionaries from the repo
      //Fetch the file
      let propObject = await fetch(url);
      let propText = await propObject.text();

      //Parse propText into XML DOM object
      const propObj = new window.DOMParser().parseFromString(
        propText,
        "text/xml"
      );

      //Pull out the elements that contain the conditional element xpath
      var condElements = propObj.getElementsByTagName(
        "diggs:conditionalElementXpath"
      );

      for (i = 0; i < condElements.length; i++) {
        // We have a match, pull out id and identifier values to populate array;
        var testNode = condElements[i].parentNode.parentNode.parentNode;
        var id = testNode.attributes.getNamedItem("gml:id").nodeValue;
        var prc = condElements[i].childNodes[0].nodeValue;

        //Depending on whether optional elements are used, the Identifier element may be either the first, second, or third childElement sibling
        if (testNode.firstElementChild.nodeName === "identifier") {
          var name = testNode.firstElementChild.childNodes[0].nodeValue;
        } else if (
          testNode.firstElementChild.nextElementSibling.nodeName ===
          "identifier"
        ) {
          name =
            testNode.firstElementChild.nextElementSibling.childNodes[0]
              .nodeValue;
        } else {
          name =
            testNode.firstElementChild.nextElementSibling.nextElementSibling
              .childNodes[0].nodeValue;
        }

        //Populate object string
        var objStr = {
          procedure: `${prc}`,
          name: `${name}`,
          id: `${id}`,
          file: `${filerec.name}`,
          url: `${url}`
        };

        //Fill Array
        propArray[propCnt] = objStr;
        propCnt++;
      }
    }
  }

  //Now let's find all of the procedures from the schema repository
  //Run the Github API to return repository contents
  repoObject = await fetch(api);
  repoJson = await repoObject.json();

  // Now loop through the xsd files to build the list arrays
  for (let rec of repoJson) {
    //Set string pointers to extract  sufffix of the repository item
    var len = rec.name.length;
    var start = len - 3;

    //Check that item is a file and that it has xsd as a suffix
    if (rec.type === "file" && rec.name.substring(start, len) == "xsd") {
      //If true we've found an xsd file, so let's examine it

      //Set URL of the file to fetch
      //    var url = rootURL + version + '/' + rec.name;
      var url = rootURL + rec.name;

      //Fetch the file
      let schObject = await fetch(url);
      let schText = await schObject.text();

      //Parse schText into XML DOM object
      const xmlObj = new window.DOMParser().parseFromString(
        schText,
        "text/xml"
      );

      //Call function to return the namespace of the xsd file
      var nameSpace = xmlObj.documentElement.attributes.getNamedItem(
        "targetNamespace"
      ).nodeValue;

      //Check to see if this is a DIGGS namespace
      if (
        nameSpace === "http://diggsml.org/schemas/2.6/geotechnical" ||
        nameSpace === "http://diggsml.org/schemas/2.6"
      ) {
        //Yes, this is a DIGGS namespace schema file, so let's record shortened nameSpace
        if (nameSpace === "http://diggsml.org/schemas/2.6/geotechnical")
          nameSpace = "diggs_geo";
        if (nameSpace === "http://diggsml.org/schemas/2.6") nameSpace = "diggs";

        //Now, let's look at the elements in the file
        var elements = xmlObj.getElementsByTagName("element");
        for (var j = 0; j < elements.length; j++) {
          //See if there is a substttutionGroup attribute, if not go to next element
          var subgroup = "";
          try {
            subgroup = elements[j].attributes.getNamedItem("substitutionGroup")
              .nodeValue;
          } catch (error) {
            continue;
          }

          //Parse subgroup to see if it is a procedure
          var start = subgroup.length - 9;
          if (subgroup.substring(start, subgroup.length) == "Procedure") {
            //Yes, we have a Procedure element, now get values for procedure arrays
            var elName = elements[j].attributes.getNamedItem("name").nodeValue;

            //Don't include abstract test elements - these are heads of substitution groups and should not be included
            if (elName.substring(0, 8) === "Abstract") continue;

            //Check to see if there's an annotation element
            try {
              if (elements[j].firstChild.nextSibling.nodeName == "annotation") {
                try {
                  var elDoc =
                    elements[j].firstChild.nextSibling.firstChild.nextSibling
                      .childNodes[0].nodeValue;
                } catch (error) {
                  elDoc = "";
                }
              }
            } catch (error) {
              elDoc = "";
            }

            //Get rid of any embedded carriage returns, new lines, tabs or extra spaces
            elDoc = elDoc.replaceAll(/\r/g, "");
            elDoc = elDoc.replaceAll(/\n/g, "");
            elDoc = elDoc.replaceAll(/\t/g, " ");
            elDoc = elDoc.replaceAll(/[ ]{2,}/g, " ");

            //Construct the UEL to the documentation page for this element
            var elLink =
              "https://diggsml.org/docs/" +
              version +
              "/" +
              rec.name.substring(0, rec.name.length - 4) +
              "_xsd_Element_" +
              nameSpace +
              "_" +
              elName +
              ".html#" +
              elName;

            //Extract test type from subgroop
            var elTestType = subgroup.substring(
              subgroup.indexOf(":") + 9,
              subgroup.length
            );

            //Create object string
            var objString = {
              name: `${elName}`,
              type: `${elTestType}`,
              link: `${elLink}`,
              doc: `${elDoc}`,
              schema: `${rec.name}`,
              ns: `${nameSpace}`
            };

            // determine which list array the object should go into depending on the type and populate arrays
            if (
              objString.type === "LaboratoryTestProcedure" ||
              objString.type === "MaterialTestProcedure"
            ) {
              labProcedures[labcnt] = objString;
              labcnt++;
            }

            if (objString.type === "InsituTestProcedure") {
              inSituProcedures[inscnt] = objString;
              inscnt++;
            }
            if (objString.type === "Procedure") {
              genericProcedures[gencnt] = objString;
              gencnt++;
            }
          }
        }
      }
    }
  }

  //Sort arrays by test name
  labProcedures.sort((a, b) => {
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
  inSituProcedures.sort((a, b) => {
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
  genericProcedures.sort((a, b) => {
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
  console.log(propArray.length);
  console.log(labProcedures.length);
  console.log(inSituProcedures.length);
  console.log(genericProcedures.length);
}

/* ------------------------------------------------------------------------------------------*/

function writeHtml() {
  txt +=
    '<div><div class="logo"><img src= "https://diggsml.org/def/img/diggs-logo.png" style="width:150px"/></div>';
  txt +=
    "<h1>Supported Test Procedures in DIGGS<br/>Version " +
    version +
    "</h1></div>";

  txt += "<details><summary>Explanation</summary>";
  txt += '<p style ="font-weight: bold;">What\'s new in Version 2.6:</p>';
  txt += '<table style="width:100%;"><tr>';
  txt += '<th class="detail">New Laboratory Test Procedures</th>';
  txt += '<th class="detail">New In-situ Test Procedures</th>';
  txt += '<th class="detail">New General Procedure</th>';
  txt += '<th class="detail">Deprecated Procedures</th></tr><tr>';

  txt += '<td class="cells">';
  txt += " <li>Aggregate Abrasion Value Test</li>";
  txt += "<li>Aggregate Crushing Value Test</li>";
  txt += "<li>Aggregate Elongation Index Test</li>";
  txt += "<li>Aggregate Flakiness Index Test</li>";
  txt += "<li>Aggregate Impact Value Test</li>";
  txt += "<li>Aggregate Polished Stone Value Test</li>";
  txt += "<li>Aggregate Slake Durability Test</li>";
  txt += "<li>Aggregate Soundness Test</li>";
  txt += "<li>Aggregate Ten Percent Fines Test</li>";
  txt += "<li>Aggregate Water Absorption Test</li>";
  txt += "<li>Bleed Test</li>";
  txt += "<li>Cation Exchange Test</li>";
  txt += "<li>Chalk Crushing Value Test</li>";
  txt += "<li>Environmental Screening Test</li>";
  txt += "<li>Frost Susceptibility Test</li>";
  txt += "<li>Lab Penetrometer Test</li>";
  txt += "<li>Lab Vane Test</li>";
  txt += "<li>Lab Velocity Test</li>";
  txt += "<li>Linear Shrinkage Test</li>";
  txt += "<li>Line Loss Test</li>";
  txt += "<li>Los Angeles Abrasion</li>";
  txt += "<li>Loss On Ignition Test</li>";
  txt += "<li>Material Gradation Test</li>";
  txt += "<li>MCV Test</li>";
  txt += "<li>Micro Deval Test</li>";
  txt += "<li>Pocket Penetrometer Test</li>";
  txt += "<li>Point Load Test</li>";
  txt += "<li>Pressure Filtration Test</li>";
  txt += "<li>Relative Density Test</li>";
  txt += "<li>Rock Porosity Density Test</li>";
  txt += "<li>Schmidt Rebound Hardness Test</li>";
  txt += "<li>Shore Scleroscope Hardness Test</li>";
  txt += "<li>Shrinkage Test</li>";
  txt += "<li>Slump Test</li>";
  txt += "<li>Suction Test</li>";
  txt += "<li>Syneresis Test</li>";
  txt += "<li>Tilt Cup Test</li>";
  txt += "<li>Viscometer Test</li>";
  txt += "<li>Washout Test</li></td>";

  txt += '<td class="cells">';
  txt += "<li>Dynamic Probe Test</li>";
  txt += "<li>GP_Field Procedure</li>";
  txt += "<li>In-situ Density Test</li>";
  txt += "<li>In-situ Penetrometer Test</li>";
  txt += "<li>In-situ Permeability Test</li>";
  txt += "<li>In-situ Resistivity Test</li>";
  txt += "<li>Pore Pressure Dissipation Test</li>";
  txt += "<li>Pressuremeter Test</li>";
  txt += "<li>Pumping Test</li></td>";

  txt += '<td class="cells">';
  txt += "<li>Geophysical Processing</li></td>";

  txt += '<td class="cells">';
  txt +=
    "<li>diggs_geo:FlameIonizationDetectorTest (replaced by diggs_geo:EnvironmentalScreeningTest)</li>";
  txt +=
    "<li>diggs_geo:PhotoIonizationDetectorTest (replaced by diggs_geo:EnvironmentalScreeningTest)";
  txt +=
    "<li>diggs_geo:TriaxialTest (replaced by updated diggs:TriaxialTest)</li></ul></td></tr></table>";

  txt +=
    '<ol><div style="font-size:20px;"><li>Procedure names in <span class = "blue">blue</span> below are legacy procedures brought back from v. 2.0 to enable AGS 4 interoperability (BetaProedures.xsd). These procedures are in beta form and may change their structure in future releases.';
  txt +=
    '<li>Procedure names in <span class = "green">green</span> below are new and are part of the grouting (Construction.xsd) and geophysics (Geophysics.xsd) schema extensions introduced in v. 2.6.</li>';
  txt +=
    '<li>Procedure names in <span class = "red">red</span> below are deprecated in v. 2.6 and replaced with new procedures as noted above.</li>';
  txt += "</div></ol>";
  txt += "<hr>";
  txt += "</details>";

  //Write tables

  //Write Title for Lab Procedures table
  txt += "<h2>Laboratory or Field Tests Performed on Material Samples</h2>";
  txt +=
    '<p style="font-style: italic;">(Click on procedure name below to view schema documentation)';

  //Call function to write body for lab procedures
  tableBody(labProcedures);

  //Now do insitu tests
  txt += "<br/><br/>";
  txt += "<h2>Field Tests Performed In-Situ</h2>";
  txt +=
    '<p style="font-style: italic;">(Click on procedure name below to view schema documentation)';
  tableBody(inSituProcedures);

  //Now do generic procedures
  txt += "<br/><br/>";
  txt += "<h2>Generic Procedures That Describe Measurement Processes</h2>";
  txt +=
    '<p style="font-style: italic;">(Click on procedure name below to view schema documentation)';
  tableBody(genericProcedures);

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

  //Add modal class info
  txt += '<div class="bg-modal">';
  txt += '<div class="modal-contents">';
  txt += "</div></div>";

  document.getElementsByTagName("body")[0].innerHTML = txt;
}

/* ------------------------------------------------------------------------------------------*/

function results(param) {
  //Set the variables to hold the modal popup text
  var t = "";
  var paramArray = [];
  var paramCnt = 0;

  //Loop through the property array and find the items that correspond with param
  for (i = 0; i < propArray.length; i++) {
    if (propArray[i].procedure.indexOf(param) >= 0) {
      //We've found a property that is associated with the param procedure
      paramArray[paramCnt] = propArray[i];

      //Now check to see if param procedure is ProcessedGeophysicalSurvey; if so, parse out the goeophysical method from param
      if (param.indexOf("GeophysicalProcessing") >= 0) {
        var prc = propArray[i].procedure;
        var method = prc.substring(prc.indexOf("text()") + 8, prc.length - 2);
        paramArray[paramCnt].method = method.toProperCase();
      }
      paramCnt++;
    }
  }

  //Sort array by property name
  paramArray.sort((a, b) => {
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

  //Then by method if param = GeophysicalProcessing
  if (param.indexOf("GeophysicalProcessing") >= 0) {
    paramArray.sort((a, b) => {
      let fa = a.method.toLowerCase(),
        fb = b.method.toLowerCase();
      if (fa < fb) {
        return -1;
      }
      if (fa > fb) {
        return 1;
      }
      return 0;
    });
  }

  //Prettify param
  var str = param.substring(param.indexOf(":") + 1, param.length);
  str = str.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

  //Write out simple title if there are no matching result properties
  if (paramArray.length == 0) {
    t += "<h1>No Result Properties Have Been Defined for <br/>" + str + "</h1>";
  } else {
    t += "<h1>Supported Result Properties for<br/>" + str + "</h1>";
    t += '<p style="font-weight: bold">Version: ' + propvers + "</p>";
    t +=
      "<p>Property dictionaries can be found at: https://diggsml.org/def/codes/DIGGS/" +
      propvers +
      "</p>";
    t += '<div class="modal">';
    t += "<table>";
    t += "<tr>";
    t += "<th>Property Name</th>";
    t += "<th>Property ID</th>";

    if (param.indexOf("GeophysicalProcessing") >= 0) {
      t += "<th>Geophysical Method</th>";
      t += "<th>Source Dictionary File</th>";
      t += "</tr>";

      //Loop to write the table rows
      for (i = 0; i < paramArray.length; i++) {
        t += "<tr>";
        t += "<td>" + paramArray[i].name + "</td>";
        t += "<td>" + paramArray[i].id + "</td>";
        t += "<td>" + paramArray[i].method + "</td>";
        t +=
          '<td><a href = "' +
          paramArray[i].url +
          '" target = "_blank">' +
          paramArray[i].file +
          "</a></td>";
        t += "</tr>";
      }
      t += "</table></div>";
    } else {
      t += "<th>Source Dictionary File</th>";
      t += "</tr>";

      //Loop to write the table rows
      for (i = 0; i < paramArray.length; i++) {
        t += "<tr>";
        t += "<td>" + paramArray[i].name + "</td>";
        t += "<td>" + paramArray[i].id + "</td>";
        t +=
          '<td><a href = "' +
          paramArray[i].url +
          '" target = "_blank">' +
          paramArray[i].file +
          "</a></td>";
        t += "</tr>";
      }
      t += "</table></div>";
    }
  }
  //Put in close cross
  t += '<div class="close">+</div>';
  document.getElementsByClassName("modal-contents")[0].innerHTML = t;
  document.querySelector(".bg-modal").style.display = "flex";
  document.querySelector(".close").addEventListener("click", function () {
    document.querySelector(".bg-modal").style.display = "none";
  });
  return false;
}

/* ------------------------------------------------------------------------------------------*/

String.prototype.toProperCase = function () {
  return this.replace(/(^|\s)\S/g, function (t) {
    return t.toUpperCase();
  });
};

/* ------------------------------------------------------------------------------------------*/

function tableBody(content) {
  txt += '<table class="fixed_header">';
  txt += "<tr>";
  txt += "<th>Procedure Name</th>";
  txt += "<th>Description</th>";
  txt += " <th>Source Schema File</th>";
  txt += "</tr>";

  //Loop through the array to populate cells
  for (i = 0; i < content.length; i++) {
    var param = "//" + content[i].ns + ":" + content[i].name;
    txt += '<tr><td class="center">';
    if (content[i].schema === "BetaProcedures.xsd") {
      txt += '<a class = "blue" href="';
    } else if (
      content[i].schema === "Construction.xsd" ||
      content[i].schema === "Geophysics.xsd"
    ) {
      txt += '<a class = "green" href="';
    } else if (content[i].schema.indexOf("deprecated") > 0) {
      txt += '<a class = "red" href="';
    } else {
      txt += '<a class = "black" href="';
    }
    txt +=
      content[i].link +
      '" target="_blank">' +
      content[i].ns +
      ":" +
      content[i].name +
      "</a>";

    //If the procedure is diggs:Specification or diggs:GP_FieldProcedure, there are no result properies so skip displaying the button
    if (
      content[i].name != "GP_FieldProcedure" &&
      content[i].name != "Specification"
    ) {
      txt +=
        '<br/><button class= "myButton" onclick = results("' +
        param +
        '")>View Result Properties</button>';
    }
    txt += "</td>";
    txt += "<td>" + content[i].doc + "</td>";
    txt += '<td class="center">' + content[i].schema + "</td>";
    txt += "</tr>";
  }
  txt += "</table>";
}

/* ------------------------------------------------------------------------------------------*/