file = r"c:\Users\ASUS\Downloads\GHRCE-AI-Timetable-v3\ghrce-timetable\frontend\src\pages\admin\MasterTimetable.js"

with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: restore the visibleDays.map wrapper
old = "              <tbody>\r\n                  return ("
new = "              <tbody>\r\n                {visibleDays.map((day) => {\r\n                  return ("
content = content.replace(old, new)

# Fix 2: close map at end of tbody - find </tbody> and add closing braces above it
# The map needs })} before </tbody>
old2 = "                  );\r\n                })}\r\n              </tbody>"
if old2 in content:
    print("closing braces already correct")
else:
    # The old isFriday ternary had extra }) - need to check what's there now  
    old2b = "                  );\r\n              </tbody>"
    new2b = "                  );\r\n                })}\r\n              </tbody>"
    if old2b in content:
        content = content.replace(old2b, new2b)
        print("Fixed closing")
    else:
        print("WARNING: could not find closing pattern - check manually")

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
