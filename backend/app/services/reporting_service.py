import io
from typing import List, Dict, Any
from jinja2 import Template
from xhtml2pdf import pisa
from datetime import datetime

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            size: A4 landscape;
            margin: 0.5cm;
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 7.5pt;
            line-height: 1.1;
        }
        .header {
            text-align: center;
            margin-bottom: 10px;
        }
        .header h1 { font-size: 14pt; font-weight: bold; margin: 0; }
        .header h2 { font-size: 9pt; font-style: italic; margin: 0; }
        .header h3 { font-size: 10pt; margin: 2px 0; }
        
        .header-info {
            width: 100%;
            margin-top: 5px;
            font-weight: bold;
        }
        
        table.grid {
            width: 100%;
            border-collapse: collapse;
            border: 1.5pt solid black;
        }
        table.grid th, table.grid td {
            border: 0.5pt solid black;
            padding: 2px;
            text-align: center;
            vertical-align: middle;
            height: 55px;
            overflow: hidden;
        }
        table.grid th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .recess {
            background-color: #eeeeee;
            font-weight: bold;
            font-size: 10pt;
            width: 30px;
        }
        .cell-pattern {
            text-align: left;
            padding: 3px;
            font-size: 7pt;
        }
        .footer-line {
            margin-top: 10px;
            font-family: Arial, sans-serif;
            font-size: 8pt;
            text-align: left;
        }
        .signature-row {
            margin-top: 40px;
            width: 100%;
        }
        .sig-box {
            display: inline-block;
            width: 24%;
            text-align: center;
            font-weight: bold;
            font-size: 9pt;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>G H RAISONI COLLEGE OF ENGINEERING, NAGPUR</h1>
        <h2>(An Empowered Autonomous Institute affiliated to Rashtrasant Tukadoji Maharaj Nagpur University)</h2>
        <h3>Department of Artificial Intelligence</h3>
        <h3>Programme: B. Tech. Artificial Intelligence ( B.Tech {{ programme_code }} )</h3>
        
        <div style="width: 100%; margin-top: 5px;">
            <div style="float: left; width: 50%; text-align: left;">Session : {{ session_year }}    w.e.f. {{ wef_date }}</div>
            <div style="float: right; width: 50%; text-align: right;">{{ term_label }} TERM - {{ season }} {{ year }}</div>
            <div style="clear: both;"></div>
        </div>
        
        <h2 style="font-size: 13pt; font-weight: bold; margin-top: 5px;">{{ semester_roman }} - {{ class_code }}</h2>
    </div>

    <table class="grid">
        <thead>
            <tr>
                <th style="width: 80px;">Day /Time</th>
                {% for label in ["09:30-10:30", "10:30-11:30", "11:30-12:30"] %}
                    <th>{{ label }}</th>
                {% endfor %}
                <th style="width: 30px;">12:30-01:30</th>
                {% for label in ["01:30-02:30", "02:30-03:30", "03:30-04:30", "04:30-05:30"] %}
                    <th>{{ label }}</th>
                {% endfor %}
            </tr>
        </thead>
        <tbody>
            {% for day in days %}
            <tr>
                <td style="font-weight: bold;">{{ day }}</td>
                {# Slots 0, 1, 2 (Pre-lunch) #}
                {% for slot_idx in range(3) %}
                    {% set entries = schedule.get((day, slot_idx), []) %}
                    <td>
                        {% for entry in entries %}
                            <div class="cell-pattern">
                                {% if entry.subject_type == 'lab' %}
                                    PR:{{ entry.subject_name }}/{{ entry.dept_code }}/{{ entry.section_code }} ({{ entry.batch_name }}/{{ entry.teacher_name }}/{{ entry.room_name }})
                                {% else %}
                                    {{ entry.subject_shortcode }} TH:{{ entry.subject_name }}/{{ entry.dept_code }}/{{ entry.section_code }}/{{ entry.teacher_name }}/{{ entry.room_name }}
                                {% endif %}
                            </div>
                        {% endfor %}
                    </td>
                {% endfor %}

                {# Recess Column #}
                {% if day == 'Monday' %}
                <td rowspan="5" class="recess">R<br/>E<br/>C<br/>E<br/>S<br/>S</td>
                {% endif %}

                {# Slots 3, 4, 5, 6 (Post-lunch) — college ends at 5:30 PM #}
                {% for slot_idx in range(3, 7) %}
                    {% set entries = schedule.get((day, slot_idx), []) %}
                    <td>
                        {% for entry in entries %}
                            <div class="cell-pattern">
                                {% if entry.subject_type == 'lab' %}
                                    PR:{{ entry.subject_name }}/{{ entry.dept_code }}/{{ entry.section_code }} ({{ entry.batch_name }}/{{ entry.teacher_name }}/{{ entry.room_name }})
                                {% else %}
                                    {{ entry.subject_shortcode }} TH:{{ entry.subject_name }}/{{ entry.dept_code }}/{{ entry.section_code }}/{{ entry.teacher_name }}/{{ entry.room_name }}
                                {% endif %}
                            </div>
                        {% endfor %}
                        {% if day == 'Friday' and slot_idx >= 5 and is_final_year %}
                            <div style="font-weight: bold; font-size: 12pt;">PROJECT</div>
                        {% endif %}
                    </td>
                {% endfor %}
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div class="footer-line">
        <strong>SUBJECT:</strong> {{ subject_footer }}
    </div>
    <div class="footer-line">
        <strong>FACULTY:</strong> {{ faculty_footer }}
    </div>

    <div class="signature-row">
        <div class="sig-box">Time Table Incharge</div>
        <div class="sig-box">Head of Department</div>
        <div class="sig-box">Dean Academics</div>
        <div class="sig-box">Director</div>
    </div>
</body>
</html>
"""

class ReportingService:
    @staticmethod
    def generate_pdf(class_obj, slots_info, timetable_slots):
        # Data Preparation
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        class_name = class_obj["name"]
        
        # Mapping schedule for Template
        # key: (day, slot_idx) -> list of entries (for parallel batches)
        schedule_map = {}
        subjects_used = {}
        faculty_used = {}
        
        for s in timetable_slots:
            schedule_map.setdefault((s.day, s.time_slot_id), []).append(s)
            subjects_used[s.subject_shortcode] = s.subject_name
            f_label = s.faculty_initials
            prefix = "DR " if "DR" in s.teacher_name.upper() else "PROF "
            faculty_used[f_label] = f"{prefix}{s.teacher_name}"

        # Footer Strings
        subj_footer = ", ".join([f"{k}: {v}" for k, v in sorted(subjects_used.items())])
        fac_footer = ", ".join([f"{k}: {v}" for k, v in sorted(faculty_used.items())])

        # Semester translation
        sem_roman = {3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII"}.get(class_obj.get("semester", 5), "V")
        
        context = {
            "programme_code": class_name.split("-")[0] if "-" in class_name else "AI",
            "session_year": "2024-2025",
            "wef_date": datetime.now().strftime("%d/%m/%Y"),
            "term_label": "ODD" if class_obj.get("semester", 5) % 2 != 0 else "EVEN",
            "season": "WINTER" if class_obj.get("semester", 5) % 2 != 0 else "SUMMER",
            "year": "2024",
            "semester_roman": sem_roman,
            "class_code": class_name,
            "days": days,
            "schedule": schedule_map,
            "subject_footer": subj_footer,
            "faculty_footer": fac_footer,
            "is_final_year": class_obj.get("semester") == 8
        }

        template = Template(HTML_TEMPLATE)
        html_out = template.render(**context)
        
        result = io.BytesIO()
        pisa.pisaDocument(io.BytesIO(html_out.encode("utf-8")), result)
        
        if not result.getvalue():
            return None
        return result.getvalue()

    @staticmethod
    def generate_excel(class_obj, timetable_slots):
        import pandas as pd
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        slots = ["09:30-10:30", "10:30-11:30", "11:30-12:30", "12:30-01:30",
                 "01:30-02:30", "02:30-03:30", "03:30-04:30", "04:30-05:30"]
        
        rows = []
        schedule_map = {}
        for s in timetable_slots:
            schedule_map.setdefault((s.day, s.time_slot_id), []).append(s)
            
        for day in days:
            row = {"Day": day}
            for i, label in enumerate(slots):
                if i == 3:
                    row[label] = "RECESS"
                    continue
                    
                entries = schedule_map.get((day, i), [])
                if not entries:
                    row[label] = "-"
                else:
                    cell_texts = []
                    for e in entries:
                        if e.subject_type == "lab":
                            cell_texts.append(f"PR:{e.subject_name}/{e.dept_code}/{e.section_code} ({e.batch_name}/{e.teacher_name})")
                        else:
                            cell_texts.append(f"{e.subject_shortcode} TH:{e.subject_name}/{e.dept_code}/{e.section_code}")
                    row[label] = "\n".join(cell_texts)
            rows.append(row)
            
        df = pd.DataFrame(rows)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name=class_obj["name"])
        return output.getvalue()
