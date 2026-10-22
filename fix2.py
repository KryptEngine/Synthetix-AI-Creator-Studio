import re
with open('server.ts', 'r') as f:
    c = f.read()

# Galti se add hui purani line ko delete karo
c = re.sub(r"app\.use\('/assets'.*?\);", "", c)

with open('server.ts', 'w') as f:
    f.write(c)
print('Purani galti delete ho gayi!')
