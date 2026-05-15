#!/bin/bash
# ═══════════════════════════════════════════════════════
#  LUMIÈRE — One-command GitHub Pages Deploy
#  Usage: bash DEPLOY.sh YOUR_GITHUB_USERNAME YOUR_GITHUB_TOKEN
# ═══════════════════════════════════════════════════════
GITHUB_USER=$1
GITHUB_TOKEN=$2
REPO_NAME="lumiere-app"

if [ -z "$GITHUB_USER" ] || [ -z "$GITHUB_TOKEN" ]; then
  echo "Usage: bash DEPLOY.sh YOUR_USERNAME YOUR_PERSONAL_ACCESS_TOKEN"
  echo ""
  echo "Get a token at: https://github.com/settings/tokens/new"
  echo "Required scope: repo"
  exit 1
fi

echo "🌟 Deploying Lumière to GitHub Pages..."
echo ""

# 1. Create the GitHub repository
echo "📁 Creating GitHub repository '$REPO_NAME'..."
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"Lumière — European Event Photo Sharing App\",\"homepage\":\"https://$GITHUB_USER.github.io/$REPO_NAME\",\"private\":false}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ Repo created:',d.get('html_url','already exists'))" 2>/dev/null || echo "ℹ️  Repo may already exist, continuing..."

sleep 2

# 2. Push code
echo "📤 Pushing code..."
cd "$(dirname "$0")"
git remote remove origin 2>/dev/null
git remote add origin "https://$GITHUB_USER:$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git"
git branch -m master main
git push -u origin main --force 2>&1 | tail -3

# 3. Enable GitHub Pages
echo "🌐 Enabling GitHub Pages..."
sleep 3
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME/pages" \
  -d '{"source":{"branch":"main","path":"/"}}' > /dev/null

echo ""
echo "═══════════════════════════════════════════════"
echo "  🎉 LUMIÈRE IS LIVE!"
echo ""
echo "  🔗 URL: https://$GITHUB_USER.github.io/$REPO_NAME"
echo "  (GitHub Pages takes ~60 seconds to go live)"
echo ""
echo "  📋 Repo: https://github.com/$GITHUB_USER/$REPO_NAME"
echo "═══════════════════════════════════════════════"
