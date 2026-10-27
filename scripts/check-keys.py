import re

src = open(r"C:\Users\lianzi\Documents\deepseek-harness\default-workspace\dsh-fish-pet\src\client.js", encoding="utf-8").read()
zh = re.search(r"const ZH = \{(.*?)\n    \}", src, re.S).group(1)
en = re.search(r"const EN = \{(.*?)\n    \}", src, re.S).group(1)
key_re = re.compile(r"'([a-z0-9.]+)':")
kz = set(key_re.findall(zh))
ke = set(key_re.findall(en))
print("zh keys", len(kz), "en keys", len(ke))
print("only zh", sorted(kz - ke))
print("only en", sorted(ke - kz))
used = set(re.findall(r"t\('([a-z0-9.]+)'\)", src))
print("used but missing:", sorted(used - kz))
for name in ("POKE_KEYS", "IDLE_KEYS"):
    block = re.search(name + r" = \[(.*?)\]", src).group(1)
    keys = re.findall(r"'([a-z0-9.]+)'", block)
    print(name, "missing:", [k for k in keys if k not in kz])
print("dynamic keys (greetingKey/toggle) ok:", all(k in kz for k in (
    "greet.morning", "greet.noon", "greet.evening", "greet.night",
    "poke.9", "poke.wake", "poke.back", "poke.dizzy",
    "menu.talk", "menu.chattyOff", "menu.chattyOn", "menu.sleep", "menu.wake",
    "menu.corner", "menu.hide", "pet.label")))
