import re
with open('server.ts', 'r') as f:
    s = f.read()
s = re.sub(r"// Serve static files.*?app\.listen", "app.listen", s, flags=re.DOTALL)
fix = '''
// --- FINAL BULLETPROOF STATIC SERVING ---
app.use(express.static('dist'));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
    return res.sendFile(process.cwd() + '/dist/index.html');
  }
  next();
});
// ----------------------------------------
app.listen'''
s = s.replace('app.listen', fix)
with open('server.ts', 'w') as f:
    f.write(s)
