"""Add cascade delete constraints for foreign keys

Revision ID: cascade_delete_constraints
Revises: add_onboarding_multistep
Create Date: 2025-01-25 17:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'cascade_delete_constraints'
down_revision = 'add_onboarding_multistep'
branch_labels = None
depends_on = None

def upgrade():
    """Add CASCADE DELETE constraints to foreign keys"""
    
    # Drop existing foreign key constraints and recreate with CASCADE
    
    # 1. Subscriptions table - app_id foreign key
    op.drop_constraint('subscriptions_app_id_fkey', 'subscriptions', type_='foreignkey')
    op.create_foreign_key(
        'subscriptions_app_id_fkey', 
        'subscriptions', 
        'apps', 
        ['app_id'], 
        ['id'], 
        ondelete='CASCADE'
    )
    
    # 2. Subscriptions table - user_id foreign key (optional, for consistency)
    op.drop_constraint('subscriptions_user_id_fkey', 'subscriptions', type_='foreignkey')
    op.create_foreign_key(
        'subscriptions_user_id_fkey', 
        'subscriptions', 
        'users', 
        ['user_id'], 
        ['id'], 
        ondelete='CASCADE'
    )
    
    # 3. Apps table - developer_id foreign key (keep as RESTRICT to prevent accidental user deletion)
    # We'll leave this as is to prevent accidental deletion of users who have apps
    
    # 4. Transactions table - user_id foreign key
    op.drop_constraint('transactions_user_id_fkey', 'transactions', type_='foreignkey')
    op.create_foreign_key(
        'transactions_user_id_fkey', 
        'transactions', 
        'users', 
        ['user_id'], 
        ['id'], 
        ondelete='CASCADE'
    )

def downgrade():
    """Remove CASCADE DELETE constraints"""
    
    # Revert to original foreign key constraints without CASCADE
    
    # 1. Subscriptions table - app_id foreign key
    op.drop_constraint('subscriptions_app_id_fkey', 'subscriptions', type_='foreignkey')
    op.create_foreign_key(
        'subscriptions_app_id_fkey', 
        'subscriptions', 
        'apps', 
        ['app_id'], 
        ['id']
    )
    
    # 2. Subscriptions table - user_id foreign key
    op.drop_constraint('subscriptions_user_id_fkey', 'subscriptions', type_='foreignkey')
    op.create_foreign_key(
        'subscriptions_user_id_fkey', 
        'subscriptions', 
        'users', 
        ['user_id'], 
        ['id']
    )
    
    # 3. Transactions table - user_id foreign key
    op.drop_constraint('transactions_user_id_fkey', 'transactions', type_='foreignkey')
    op.create_foreign_key(
        'transactions_user_id_fkey', 
        'transactions', 
        'users', 
        ['user_id'], 
        ['id']
    )