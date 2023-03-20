const api = "https://sentry.io/api/0/organizations/"
let url;
org = ''
function currentOrg(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    url = activeTab.url; 
    const org = url.split('.sentry.io')[0]
    start(org.substring(8) + '/');
    // start(org);
  });

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

async function getTeamSlaIssues(teamName, org, sla='72h') {
  issueSlaDict = {}
  const issues = await fetch(api+org+issueQuery+teamName+slaQuery+sla+issueAppend).then(r=>r.json()).then(result => {
    return result;
  });
  let groupIssues = 'groups='
  if (issues.length > 20) {

  }
  issues.forEach(issue => {
    issueSlaDict[issue['id']]=[issue['shortId'],issue['title'],issue['culprit'],issue['permalink']]
    groupIssues = groupIssues + issue['id'] +'&groups=';
  })
  groupIssues = groupIssues.slice(0,-8) + "&";
  if (groupIssues == '&') {
    return 'blank'
  }
  if ((groupIssues.match(/groups/g) || []).length > 15) {
    // TODO handle larger than max amount of groups
  }
  const issueStats = await fetch(api+org+issueStatsQuery+groupIssues+sentryQueryParam+teamName+slaQuery+sla+issueAppend).then(r=>r.json()).then(result => {
    return result;
  })
  if('detail' in issueStats) {
    return 'too big'
  }
  issueStats.forEach(issue => {
    issueSlaDict[issue['id']].push(issue['lifetime']['count'],issue['lifetime']['firstSeen'])
  })
  return issueSlaDict;
}

async function checkCache(org) {
  let correctOrg = await chrome.storage.session.get("productivityExtensionOrg").then((result) => { return result["productivityExtensionOrg"]==org })
  if (!correctOrg) return false;
  cacheExists = await chrome.storage.session.get("productivityExtensionTeams").then((result) => { return result["productivityExtensionTeams"]!=undefined })
  return cacheExists
}


function addSlaTable(team, issues) {
  let tbl = document.createElement('table');
  tbl.setAttribute('id','teamsSlaTable')
  tbl.style.width = '100px';
  tbl.style.border = '1px solid black';
  const firstRow = tbl.insertRow()
  const firstCell = firstRow.insertCell()
  const secondCell = firstRow.insertCell()
  const thirdCell = firstRow.insertCell()
  const fourthCell = firstRow.insertCell()
  var text = document.createTextNode("Issue ID")
  firstCell.appendChild(text);
  firstCell.style.border = '1px solid black';
  text = document.createTextNode("Issue Name")
  secondCell.appendChild(text);
  secondCell.style.border = '1px solid black';
  text = document.createTextNode("First Seen")
  thirdCell.appendChild(text);
  thirdCell.style.border = '1px solid black';
  text = document.createTextNode("Count")
  fourthCell.appendChild(text);
  fourthCell.style.border = '1px solid black';

  for (let key in issues) {
    const tr = tbl.insertRow()
    const issueID = tr.insertCell()
    const issueName = tr.insertCell()
    const firstSeen = tr.insertCell()
    const count = tr.insertCell()
    text = document.createTextNode(issues[key][0])
    var link = document.createElement("a");
    link.setAttribute("href", issues[key][3])
    link.appendChild(text);
    issueID.appendChild(link);
    issueID.style.border = '1px solid black';
    text = document.createTextNode(issues[key][1])
    issueName.appendChild(text)
    issueName.style.border = '1px solid black';
    text = document.createTextNode(issues[key][5])
    firstSeen.appendChild(text)
    firstSeen.style.border = '1px solid black';
    text = document.createTextNode(issues[key][4])
    count.appendChild(text)
    count.style.border = '1px solid black';
  }
  document.body.appendChild(tbl);
}

function addTeamSpan(sortedArray) {
  sortedArray.reverse();
  let tbl = document.createElement('table');
  tbl.setAttribute('id','teamsIssueTable')
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
  let tabDiv = document.getElementById('teamTabs') ?? document.createElement('div');
  tabDiv.setAttribute('class','tab');
  tabDiv.setAttribute('id', 'teamTabs')

  sortedArray.forEach(key => {
    const tr = tbl.insertRow()
    const teamName = tr.insertCell()
    const teamIssues = tr.insertCell()
    text = document.createTextNode(key)
    var link = document.createElement("a");
    link.setAttribute("href",api.replace('/api/0','')+org+'issues/?query=is%3Aunresolved+assigned%3A%23'+key+'&statsPeriod=90d')
    link.appendChild(text);
    teamName.appendChild(link)
    teamName.style.border = '1px solid black';
    text = document.createTextNode(teamDict[key])
    teamIssues.appendChild(text)
    teamIssues.style.border = '1px solid black';

  });
  if (document.getElementById('teamTabs') == null) {
    document.body.appendChild(tabDiv);
  }
  document.body.appendChild(tbl);
  if (document.getElementById('downloadButton')==null) {
    const downloadButton = document.createElement('button');
    downloadButton.setAttribute('id','downloadButton')
    downloadButton.onclick = download_table_as_csv
    downloadButton.innerText = "Download as CSV"
    document.body.appendChild(downloadButton)
  }
}


async function openTeam(team,sla='72h') {


  // // Get all elements with class="tablinks" and remove the class "active"
  // tablinks = document.getElementsByClassName("tablinks");
  // for (i = 0; i < tablinks.length; i++) {
  //   tablinks[i].className = tablinks[i].className.replace(" active", "");
  // }
  if (document.getElementById('errorMessage') != null) {
    document.getElementById('errorMessage').remove();
  }
  if (document.getElementById('teamsIssueTable') != null) {
    document.getElementById('teamsIssueTable').remove();
  }
  if (document.getElementById('teamsSlaTable') != null) {
    document.getElementById('teamsSlaTable').remove();
  }  
  if (team != 'top-teams') {
    
  let org = await chrome.storage.session.get("productivityExtensionOrg").then((result) => { return result["productivityExtensionOrg"] })
  let issues = await getTeamSlaIssues(team, org, sla)

  if (issues != 'blank' && issues != 'too big') {
    addSlaTable(team,issues);
  } else if (issues == 'too big') {
    let paragraph = document.createElement('p');
    paragraph.setAttribute('id', 'errorMessage');
    let text = document .createTextNode('The SLA provided produces too many issues to display.');
    paragraph.appendChild(text);
    document.body.appendChild(paragraph);
  } else if (issues == 'blank') {
    let paragraph = document.createElement('p');
    paragraph.setAttribute('id', 'errorMessage');
    let text = document .createTextNode('The SLA provided produces no results.');
    paragraph.appendChild(text);
    document.body.appendChild(paragraph);
  }
  } else {
    sortedTeams = sortTeams(teamDict)
    var sliceNumber = selectedNumberOfIssues.value * -1;
    addTeamSpan(sortedTeams.slice(sliceNumber));
  }
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

function download_table_as_csv(event, table_id='teamsIssueTable', separator = ',') {
  // Select rows from table_id
  if (document.getElementById('teamsIssueTable') == null) {
    table_id = 'teamsSlaTable'
  }
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
const issueStatsQuery = "issues-stats/?";
const sentryQueryParam = "query=is:unresolved assigned:%23";
const slaQuery = "+firstSeen%3A%2B";
const issueAppend = "&shortIdLookup=1&statsPeriod=90d";
let teamDict = {};
var selectedNumberOfIssues = document.getElementById("teamNumbers");
selectedNumberOfIssues.addEventListener("change",()=>{ document.getElementById('teamsIssueTable').remove(); addTeamSpan(sortedTeams.slice(-selectedNumberOfIssues.value));
})
var select = document.getElementById("team-sla-name");
var slaSelect = document.getElementById("teamSLA");
select.addEventListener("change",()=>{openTeam(select.value,slaSelect.value);});
slaSelect.addEventListener("change",()=>{openTeam(select.value,slaSelect.value);});
var checkOpen = 0
var sortedTeams = []
currentOrg();


async function start(org){

  if (!(await checkCache(org))) {

      teamDict = {}
      const teams = await getTeams(org);
      select.options[select.options.length] = new Option('Top teams', 'top-teams')
      for(index in teams) {
        select.options[select.options.length] = new Option(teams[index]['name'], teams[index]['name']);
      }
     
      selectedNumberOfIssues = document.getElementById("teamNumbers");
      teams.forEach(element => {
    
          var timeNow = Date.now();
          while(Date.now()<timeNow+140){
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
    

  } else {
      chrome.storage.session.get("productivityExtensionTeams").then((result) => { 
         teamDict = result["productivityExtensionTeams"]
         select.options[select.options.length] = new Option('Top teams', 'top-teams')
         for(index in teamDict) {
          select.options[select.options.length] = new Option(index, index);
         }
         sortedTeams = sortTeams(teamDict)
         var sliceNumber = selectedNumberOfIssues.value * -1;
         addTeamSpan(sortedTeams.slice(sliceNumber));
         checkOpen+=1;
        })
  }

}

