const api = "https://sentry.io/api/0/organizations/"
let url;

function currentOrg(){
  // var org = 'testorg-az/'
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    url = activeTab.url; 
    const org = url.split('/')[4] + "/"
    start(org);
  });
  // return org;
  // return "sentry/";
  // return "testorg-az/";
  // return "zendesk-us/";

}

async function getTeams(org){
  const teams = await fetch(api+org+teamsQuery).then(r => r.json())
  return teams
}

async function getTeamIssues(org,team){
  const numIssues = await fetch(api+org+issueQuery+team['name']+issueAppend).then(r=>r.json()).then(result => {
    return result.length
  })
  return numIssues
}

async function checkTeamSLA(teamName, sla=48) {
  const issues = await fetch(api+org+issueQuery+team['name']+slaQuery+sla+'h'+issueAppend).then(r=>r.json()).then(result => {
    return result;
  });
  return issues;
}

async function checkCache(org) {
  let correctOrg = await chrome.storage.session.get("productivityExtensionOrg").then((result) => { return result["productivityExtensionOrg"]==org })
  if (!correctOrg) return false;
  cacheExists = await chrome.storage.session.get("productivityExtensionTeams").then((result) => { return result["productivityExtensionTeams"]!=undefined })
  return cacheExists
}

function addTeamSpan(sortedArray) {
  sortedArray.reverse();
  let tbl = document.createElement('table');
  tbl.setAttribute('id','table')
  tbl.style.width = '100px';
  tbl.style.border = '1px solid black';
  const firstRow = tbl.insertRow()
  const firstCell = firstRow.insertCell()
  const secondCell = firstRow.insertCell()
  var text = document.createTextNode("Team name")
  firstCell.appendChild(text);
  firstCell.style.border = '1px solid black';
  text = document.createTextNode("Unresovled issues")
  secondCell.appendChild(text);
  secondCell.style.border = '1px solid black';
  let tabDiv = document.createElement('div');
  tabDiv.setAttribute('class','tab');

  sortedArray.forEach(key => {
    const tr = tbl.insertRow()
    const teamName = tr.insertCell()
    const teamIssues = tr.insertCell()
    text = document.createTextNode(key)
    teamName.appendChild(text)
    teamName.style.border = '1px solid black';
    text = document.createTextNode(teamDict[key])
    teamIssues.appendChild(text)
    teamIssues.style.border = '1px solid black';

    // add tab for each taem
    const tab = document.createElement('button')
    tab.setAttribute('class', 'tablinks');
    tab.setAttribute('id',key);
    tab.setAttribute('value',key);
    // tab.setAttribute('','');
    // tab.onclick = openTeam(event,key)
});
document.body.appendChild(tbl);
const downloadLink = document.createElement('a');
}


function openTeam(evt, team) {
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(team).style.display = "block";
  evt.currentTarget.className += " active";

}


function sortTeams(teamDictionary){
  let newDict = {}
  var items = Object.keys(teamDictionary).map(
    (key) => { return [key, teamDictionary[key]] });

  items.sort(
    (first, second) => { return first[1] - second[1] }
  );

  var keys = items.map(
    (e) => { return e[0] });

  return keys
}

function download_table_as_csv(table_id, separator = ',') {
  // Select rows from table_id
  var rows = document.querySelectorAll('table#' + table_id + ' tr');
  // Construct csv
  var csv = [];
  for (var i = 0; i < rows.length; i++) {
      var row = [], cols = rows[i].querySelectorAll('td, th');
      for (var j = 0; j < cols.length; j++) {
          var data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ')
          data = data.replace(/"/g, '""');
          // Push escaped string
          row.push('"' + data + '"');
      }
      csv.push(row.join(separator));
  }
  var csv_string = csv.join('\n');
  // Download it
  var filename = 'export_' + table_id + '_' + new Date().toLocaleDateString() + '.csv';
  var link = document.createElement('a');
  link.style.display = 'none';
  link.setAttribute('target', '_blank');
  link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv_string));
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const teamsQuery = "teams/";
const issueQuery = "issues/?collapse=stats&expand=owners&expand=inbox&limit=1000&query=is:unresolved assigned:%23";
const slaQuery = "+firstSeen%3A%2B";
const issueAppend = "&shortIdLookup=1&statsPeriod=90d";
let teamDict = {};
var selectedNumberOfIssues = document.getElementById("teamNumbers");
selectedNumberOfIssues.addEventListener("change",()=>{ document.getElementById('table').remove(); addTeamSpan(sortedTeams.slice(-selectedNumberOfIssues.value));
})
var checkOpen = 0
var sortedTeams = []
currentOrg();


async function start(org){
  // chrome.storage.session.get("productivityExtensionTeams").then((result) => { teamDict = result["productivityExtensionTeams"]})
  if (!(await checkCache(org))) {
    // ;(async () => { 
      teamDict = {}
      const teams = await getTeams(org);
      selectedNumberOfIssues = document.getElementById("teamNumbers");
      teams.forEach(element => {
    
          var timeNow = Date.now();
          while(Date.now()<timeNow+120){
            var x = 1;
          }
          ;(async () => { ;
            const issueNumber = await getTeamIssues(org,element);
            teamDict[element['name']]=issueNumber;
            chrome.storage.session.set({ "productivityExtensionTeams" : teamDict})
            chrome.storage.session.set({ "productivityExtensionOrg" : org})
            sortedTeams = sortTeams(teamDict);
            if (sortedTeams.length == teams.length) {
              return sortedTeams;
            }
          })().then(() => {
    
            if (sortedTeams.length == teams.length-1) {
              var sliceNumber = selectedNumberOfIssues.value * -1;
              addTeamSpan(sortedTeams.slice(sliceNumber));
              checkOpen+=1;
            }
          })
        })
    
    // })();

  } else {
      chrome.storage.session.get("productivityExtensionTeams").then((result) => { 
         teamDict = result["productivityExtensionTeams"]
         sortedTeams = sortTeams(teamDict)
         var sliceNumber = selectedNumberOfIssues.value * -1;
         addTeamSpan(sortedTeams.slice(sliceNumber));
         checkOpen+=1;
        })
  }

}

