import sys
import os
import random
# Mocking parts of TimetableEngine to test logic
class MockSubject:
    def __getitem__(self, key):
        if key == "type": return "theory"
        if key == "weekly_load": return 4
        if key == "id": return random.randint(1, 100)
        return None

def test_logic():
    # Test Case 1: 4 subjects selected
    selected_theory = [MockSubject() for _ in range(4)]
    theory_load_override = 3 if len(selected_theory) == 4 else None
    
    loads = []
    for s in selected_theory:
        load = theory_load_override if theory_load_override is not None else s["weekly_load"]
        loads.append(load)
    
    print(f"Pool size 4, Loads: {loads}")
    assert all(l == 3 for l in loads)

    # Test Case 2: 5 subjects selected
    selected_theory = [MockSubject() for _ in range(5)]
    theory_load_override = 3 if len(selected_theory) == 4 else None
    
    loads = []
    for s in selected_theory:
        load = theory_load_override if theory_load_override is not None else s["weekly_load"]
        loads.append(load)
    
    print(f"Pool size 5, Loads: {loads}")
    assert all(l == 4 for l in loads)

if __name__ == "__main__":
    test_logic()
    print("Logic test passed!")
