import json
import re
from pathlib import Path

questions_file = Path('ASTQB-GenAI_Sample-Questions.clean.txt')
answers_file = Path('ASTQB-GenAI_Sample-Answers.clean.txt')
genai_file = Path('genai.json')

q_text = questions_file.read_text(encoding='utf-8')
a_text = answers_file.read_text(encoding='utf-8')

# Parse questions line by line
questions_dict = {}
lines = q_text.split('\n')
i = 0
while i < len(lines):
    line = lines[i].strip()
    # Match "1. (1 pt) Question text?"
    m = re.match(r'^(\d+)\.\s*\([^)]*\)\s*(.+)', line)
    if m:
        q_num = int(m.group(1))
        q_str = m.group(2).strip()
        i += 1
        
        # Gather question lines until we hit 'a.'
        while i < len(lines) and not re.match(r'^[a-d]\.\s', lines[i].lstrip()):
            if lines[i].strip():
                q_str += ' ' + lines[i].strip()
            i += 1
        
        # Parse options a, b, c, d
        opts = []
        while i < len(lines) and re.match(r'^[a-d]\.', lines[i].lstrip()):
            opt_m = re.match(r'^[a-d]\.\s+(.+)', lines[i].lstrip())
            if opt_m:
                opt_text = opt_m.group(1).strip()
                i += 1
                # gather continuation lines for this option
                while i < len(lines) and not re.match(r'^[a-d]\.|^\d+\.', lines[i].lstrip()):
                    if lines[i].strip():
                        opt_text += ' ' + lines[i].strip()
                    i += 1
                opts.append(opt_text)
            else:
                i += 1
        
        if len(opts) == 4:
            questions_dict[q_num] = {
                'question': ' '.join(q_str.split()),
                'options': [' '.join(o.split()) for o in opts]
            }
        continue
    i += 1

# Parse answers
answers_dict = {}
lines = a_text.split('\n')
i = 0
while i < len(lines):
    line = lines[i].strip()
    m = re.match(r'^(\d+)\.\s*\([^)]*\)', line)
    if m:
        q_num = int(m.group(1))
        i += 1
        # Find line with "X is correct."
        expl = []
        correct = None
        while i < len(lines) and not re.match(r'^\d+\.', lines[i].lstrip()):
            # Look for "A is correct.", "B is correct.", etc.
            cm = re.search(r'([A-D]) is correct\.', lines[i], re.IGNORECASE)
            if cm and not correct:
                correct = cm.group(1).upper()
                # Get text after "is correct."
                rest = re.split(r'[A-D] is correct\.', lines[i], maxsplit=1, flags=re.IGNORECASE)
                if len(rest) > 1 and rest[1].strip():
                    expl.append(rest[1].strip())
            elif correct and lines[i].strip():
                expl.append(lines[i].strip())
            i += 1
        
        if correct:
            explanation = ' '.join(expl)
            explanation = ' '.join(explanation.split())  # normalize spaces
            answers_dict[q_num] = {'correct': correct, 'explanation': explanation}
        continue
    i += 1

print(f"Parsed {len(questions_dict)} questions and {len(answers_dict)} answers")

# Load existing genai.json
with genai_file.open('r', encoding='utf-8') as f:
    existing_data = json.load(f)

# Check for duplicates
existing_q_set = set()
for entry in existing_data:
    q = entry.get('question', '').strip().lower()
    existing_q_set.add(q)

max_id = max((e.get('id', 0) for e in existing_data), default=0)

# Add unique questions
added = []
for q_num in sorted(questions_dict.keys()):
    if q_num not in answers_dict:
        continue
    
    q_data = questions_dict[q_num]
    a_data = answers_dict[q_num]
    q_norm = q_data['question'].strip().lower()
    
    if q_norm in existing_q_set:
        continue
    
    correct_idx = ord(a_data['correct']) - ord('A')
    max_id += 1
    
    new_entry = {
        'id': max_id,
        'question': q_data['question'],
        'options': q_data['options'],
        'correctAnswer': correct_idx,
        'explanation': a_data['explanation']
    }
    
    existing_data.append(new_entry)
    existing_q_set.add(q_norm)
    added.append(max_id)

# Write
with genai_file.open('w', encoding='utf-8') as f:
    json.dump(existing_data, f, indent=4, ensure_ascii=False)

print(f"Added {len(added)} new questions with IDs: {added}")
