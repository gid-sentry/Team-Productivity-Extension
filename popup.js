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


function addTeamSpan(sortedArray,org) {
  sortedArray.reverse();
  sortedArray.forEach(key => {
    let newDiv = document.createElement('div');
    newDiv.classList.add('teams');
    newDiv.setAttribute("id", "team")
    document.body.appendChild(newDiv)
    let newSpan = document.createElement('span')
    let text = document.createTextNode(key + ":" +teamDict[key])
    newSpan.appendChild(text)
    newSpan.title = key + ":" +teamDict[key];
    newSpan.href = "https://sentry.io/organizations/"+org+"issues/is%3Aunresolved+assigned%3A%23"+key+"&referrer=issue-list&statsPeriod=90d"
    // newSpan.innerText = key + ":" +teamDict[key]
    // newSpan.href = "https://sentry.io/organizations/"+org+"issues/is%3Aunresolved+assigned%3A%23"+key+"&referrer=issue-list&statsPeriod=14d"
    newDiv.append(newSpan)
    newSpan.href = "https://sentry.io/organizations/"+org+"issues/is%3Aunresolved+assigned%3A%23"+key+"&referrer=issue-list&statsPeriod=90d"
    newSpan.style.fontSize = "large";
})
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
const teamsQuery = "teams/"
const issueQuery = "issues/?collapse=stats&expand=owners&expand=inbox&limit=1000&query=is:unresolved assigned:%23"
const issueAppend = "&shortIdLookup=1&statsPeriod=90d"
let teamDict = {}
var selectedNumberOfIssues = document.getElementById("teamNumbers");
selectedNumberOfIssues.addEventListener("change",onChangeSelection(this))
var checkOpen = 0
var sortedTeams = []
currentOrg();
function start(org){
  ;(async () => { 
    console.log(org)
    const teams = await getTeams(org)
    selectedNumberOfIssues = document.getElementById("teamNumbers");
    selectedNumberOfIssues.addEventListener("change",onChangeSelection(this))
    teams.forEach(element => {
  
        var timeNow = Date.now()
        while(Date.now()<timeNow+120){
          var x = 1
        }
        ;(async () => { 
          const issueNumber = await getTeamIssues(org,element)
          teamDict[element['name']]=issueNumber
          sortedTeams = sortTeams(teamDict)
          if (sortedTeams.length == teams.length) {
            return sortedTeams;
          }
        })().then(() => {
  
          if (sortedTeams.length == teams.length-1) {
            var sliceNumber = selectedNumberOfIssues.value * -1
            addTeamSpan(sortedTeams.slice(sliceNumber),org)
            checkOpen+=1
          }
        })
      })
  
  })()

}


function onChangeSelection(option) {
  // console.log('option is ')
  // console.log(option)
  // [...document.getElementsByClassName("teams")].map(n => n && n.remove());
  //  selectedNumberOfIssues = document.getElementById("teamNumbers").value;
  // var sliceNumber = document.getElementById("teamNumbers").value * -1
  // console.log("slice number is ")
  // console.log(sliceNumber)
  // if (checkOpen > 0){
  //   addTeamSpan(sortedTeams.slice(sliceNumber))
  // }
}
