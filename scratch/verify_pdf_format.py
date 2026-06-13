import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.reporting_service import ReportingService

class MockSlot:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def test_pdf():
    class_obj = {"id": 1, "name": "CSE-AIML-VI-A", "semester": 6}
    
    # Mock some slots
    slots = [
        MockSlot(
            day="Monday", time_slot_id=0, subject_name="Blockchain Technology", 
            subject_shortcode="BCT", subject_type="theory", 
            dept_code="CAI", section_code="VI/A", 
            teacher_name="ABHAY YEOLE", room_name="E-33", faculty_initials="AY"
        ),
        MockSlot(
            day="Tuesday", time_slot_id=1, subject_name="Deep Learning", 
            subject_shortcode="DL", subject_type="lab", 
            dept_code="CAI", section_code="VI/A", 
            teacher_name="MANISHA RAUT", room_name="C-13(A)", 
            batch_name="A2", faculty_initials="MR"
        ),
        # Parallel batches
        MockSlot(
            day="Tuesday", time_slot_id=1, subject_name="Blockchain Technology", 
            subject_shortcode="BCT", subject_type="lab", 
            dept_code="CAI", section_code="VI/A", 
            teacher_name="ABHAY YEOLE", room_name="W-21", 
            batch_name="A1", faculty_initials="AY"
        )
    ]

    pdf_content = ReportingService.generate_pdf(class_obj, None, slots)
    
    if pdf_content:
        output_path = "scratch/test_timetable_format.pdf"
        os.makedirs("scratch", exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(pdf_content)
        print(f"PDF generated successfully at {output_path}")
    else:
        print("Failed to generate PDF")

if __name__ == "__main__":
    test_pdf()
