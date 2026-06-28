# Push Layer 7 to GitHub

```bash
unzip continuum-memory-layer7.zip
git clone https://github.com/thomascarter613/continuum-memory.git continuum-memory-github
rsync -a --delete continuum-memory/ continuum-memory-github/
cd continuum-memory-github
git status
git add .
git commit -m "feat: add artifact memory and repo indexing"
git push -u origin main
```
