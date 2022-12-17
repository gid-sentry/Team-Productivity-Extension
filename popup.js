const api = "https://sentry.io/api/0/organizations/";
let url;

function currentOrg(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    url = activeTab.url; ;
    const org = url.split('/')[4] + "/";
    start(org);
  });

}

async function getTeams(org){
  const teams = await fetch(api+org+teamsQuery).then(r => r.json());
  return teams;
}

async function getTeamIssues(org,team){
  const numIssues = await fetch(api+org+issueQuery+team['name']+issueAppend).then(r=>r.json()).then(result => {
    return result.length;
  });
  return numIssues;
}

function addTeamSpan(sortedArray) {
  sortedArray.reverse();
  let tbl = document.createElement('table');
  tbl.setAttribute('id','table');
  tbl.style.width = '100px';
  tbl.style.border = '1px solid black';
  const firstRow = tbl.insertRow();
  const firstCell = firstRow.insertCell();
  const secondCell = firstRow.insertCell();
  var text = document.createTextNode("Team name");
  firstCell.appendChild(text);
  firstCell.style.border = '1px solid black';
  text = document.createTextNode("Unresovled issues");
  secondCell.appendChild(text);
  secondCell.style.border = '1px solid black';
  sortedArray.forEach(key => {
    const tr = tbl.insertRow();
    const teamName = tr.insertCell();
    const teamIssues = tr.insertCell();
    text = document.createTextNode(key);
    teamName.appendChild(text);
    teamName.style.border = '1px solid black';
    text = document.createTextNode(teamDict[key]);
    teamIssues.appendChild(text);
    teamIssues.style.border = '1px solid black';

});
document.body.appendChild(tbl);
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

  return keys;
}

const teamsQuery = "teams/";
const issueQuery = "issues/?collapse=stats&expand=owners&expand=inbox&limit=1000&query=is:unresolved assigned:%23";
const issueAppend = "&shortIdLookup=1&statsPeriod=90d";
let teamDict = {}
var selectedNumberOfIssues = document.getElementById("teamNumbers");
selectedNumberOfIssues.addEventListener("change",()=>{ document.getElementById('table').remove(); addTeamSpan(sortedTeams.slice(-selectedNumberOfIssues.value));
});
var checkOpen = 0;
var sortedTeams = [];
currentOrg();
function start(org){
  ;(async () => { 
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
  
  })();

}

