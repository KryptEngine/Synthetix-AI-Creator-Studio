import re
with open('vite.config.ts', 'r') as f:
    c = f.read()
c = re.sub(r"define:\s*\{\s*'process\.env':\s*\{\s*\}\s*\},?", "", c)
with open('vite.config.ts', 'w') as f:
    f.write(c)
print('Vite config fix ho gaya!')
