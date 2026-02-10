
import requests

leagues = {
    'English Premier League': '4328',
    'Spanish La Liga': '4335',
    'Italian Serie A': '4332'
}

for league_name, league_id in leagues.items():
    url = f"https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id={league_id}"
    r = requests.get(url)
    data = r.json()
    print(f"--- {league_name} (ID: {league_id}) ---")
    if data and data.get('events'):
        for event in data['events'][:2]:
            print(f"{event['strHomeTeam']} vs {event['strAwayTeam']} ({event['strLeague']})")
    else:
        print("No events found")
