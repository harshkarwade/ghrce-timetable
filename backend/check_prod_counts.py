from sqlalchemy import create_engine, text
engine = create_engine('postgresql://neondb_owner:npg_WN0IRfyjAmY5@ep-summer-voice-am361anj-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require')
with engine.connect() as conn:
    print('== Production DB Row Counts ==')
    for t in ['departments','teachers','subjects','classes','rooms','time_slots','users','teacher_subjects']:
        n = conn.execute(text(f'SELECT COUNT(*) FROM {t}')).scalar()
        print(f'  {t}: {n}')
    admin = conn.execute(text("SELECT id, email, role FROM users WHERE role='admin'")).fetchone()
    print(f'\nAdmin user: {admin}')
