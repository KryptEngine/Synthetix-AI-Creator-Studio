import re

# 1. Vite config theek karo (base '/' karo)
with open('vite.config.ts', 'r') as f:
    v = f.read()
v = v.replace("base: './'", "base: '/'")
with open('vite.config.ts', 'w') as f:
    f.write(v)

# 2. Server ka fallback theek karo
with open('server.ts', 'r') as f:
    s = f.read()

# Purana fallback hatao
s = re.sub(r'// Serve static files from the React app.*?next\(\);\n\}\);', '', s, flags=re.DOTALL)

# Naya safe fallback daalo
fix = '''
// Serve static files
app.use(express.static(path.join(process.cwd(), 'dist')));

// Express 5 safe SPA fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
    return res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  }
  next();
});
'''
s = s.replace('app.listen', fix + '\napp.listen')
with open('server.ts', 'w') as f:
    f.write(s)
print('Code permanently fixed!')
