from app import app
from models.models import User, db

with app.app_context():
    existing = User.query.filter_by(username="admin").first()
    if existing:
        existing.set_password("admin123")
        existing.is_admin = True
        db.session.commit()
        print("Admin user updated with password 'admin123'")
    else:
        user = User(username="admin", is_admin=True)
        user.set_password("admin123")
        db.session.add(user)
        db.session.commit()
        print("Admin user created with username 'admin' and password 'admin123'")
