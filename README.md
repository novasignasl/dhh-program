# NovaSign GitHub JSON Player Test

This test version lets one external JSON file control:

1. the Vimeo video
2. the chip button labels
3. the chip button timestamps

## Folder structure

```text
assets/css/asl-player.css
assets/js/asl-player-json.js
lessons/good-morning.json
index.html
thrivecart-embed-example.html
```

## Recommended branch workflow

```bash
git checkout main
git pull origin main
git checkout -b test/json-player
```

Copy these files into your repo, then:

```bash
git add .
git commit -m "Add NovaSign JSON player test"
git push -u origin test/json-player
```

Open GitHub and create a pull request, but do not merge until tested.

## GitHub Pages test

For the easiest test, publish GitHub Pages from this test branch.

Then open:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/
```

## ThriveCart test

Use the code in:

```text
thrivecart-embed-example.html
```

Replace `YOUR-GITHUB-USERNAME` and `YOUR-REPO-NAME` with your real GitHub Pages URL.
