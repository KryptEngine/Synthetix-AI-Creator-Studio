import re
with open('server.ts', 'r') as f:
    c = f.read()

c = re.sub(r'// Serve static files.*?app\.listen', 'app.listen', c, flags=re.DOTALL)

fix = '''
// Serve static files from the React app
app.use(express.static(path.join(process.cwd(), 'dist')));

// SPA fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.indexOf('/api') !== 0) {
    return res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  }
  next();
});
'''
c = c.replace('app.listen', fix + '\napp.listen')
with open('server.ts', 'w') as f:
    f.write(c)
print('Code safely fixed!')
