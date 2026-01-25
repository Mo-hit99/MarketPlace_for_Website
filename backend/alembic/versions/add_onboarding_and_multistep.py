"""Add onboarding and multi-step app creation

Revision ID: add_onboarding_multistep
Revises: 719b4adead89
Create Date: 2025-01-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_onboarding_multistep'
down_revision = '719b4adead89'
branch_labels = None
depends_on = None

def upgrade():
    # Create the enum type first
    appcategory_enum = postgresql.ENUM('PRODUCTIVITY', 'BUSINESS', 'EDUCATION', 'ENTERTAINMENT', 'UTILITIES', 'SOCIAL', 'FINANCE', 'HEALTH', 'OTHER', name='appcategory')
    appcategory_enum.create(op.get_bind())
    
    # Add new columns to users table
    op.add_column('users', sa.Column('full_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('company', sa.String(), nullable=True))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('preferences', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('deployment_service_paid', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('deployment_service_amount', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))
    
    # Add new columns to apps table
    op.add_column('apps', sa.Column('category', appcategory_enum, nullable=True, server_default='OTHER'))
    op.add_column('apps', sa.Column('price', sa.Float(), nullable=True, server_default='9.99'))
    op.add_column('apps', sa.Column('step_completed', sa.Integer(), nullable=False, server_default='0'))
    
    # Change description column type to Text
    op.alter_column('apps', 'description', type_=sa.Text(), nullable=True)

def downgrade():
    # Remove columns from apps table
    op.drop_column('apps', 'step_completed')
    op.drop_column('apps', 'price')
    op.drop_column('apps', 'category')
    
    # Change description back to String
    op.alter_column('apps', 'description', type_=sa.String(), nullable=True)
    
    # Remove columns from users table
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'deployment_service_amount')
    op.drop_column('users', 'deployment_service_paid')
    op.drop_column('users', 'onboarding_completed')
    op.drop_column('users', 'preferences')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'company')
    op.drop_column('users', 'full_name')
    
    # Drop the enum type
    appcategory_enum = postgresql.ENUM(name='appcategory')
    appcategory_enum.drop(op.get_bind())