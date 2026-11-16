import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written. Placeholder NGN prices; admins change them via PATCH /profile/subscriptions/plans/:audience/:code.
export class SeedSubscriptionPlans1794844873869 implements MigrationInterface {
  name = 'SeedSubscriptionPlans1794844873869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "subscription_plans"
        ("code", "audience", "name", "description", "price", "currency", "interval", "is_active", "features", "sort_order")
      VALUES
        ('free', 'patient', 'Free', 'Essential access for patients', 0, 'NGN', 'monthly', true,
         '["Book appointments", "Order drugs and lab tests"]', 0),
        ('basic', 'patient', 'Basic', 'More for everyday care', 2500, 'NGN', 'monthly', true,
         '["Everything in Free", "Priority support"]', 1),
        ('premium', 'patient', 'Premium', 'Full access including the AI health assistant', 5000, 'NGN', 'monthly', true,
         '["Everything in Basic", "AI health assistant", "Family profiles"]', 2),
        ('free', 'provider', 'Free', 'Get listed and start receiving patients', 0, 'NGN', 'monthly', true,
         '["Profile listing", "Appointments and requisitions"]', 0),
        ('professional', 'provider', 'Professional', 'Grow your practice', 10000, 'NGN', 'monthly', true,
         '["Everything in Free", "Featured placement", "Advanced analytics"]', 1)
      ON CONFLICT ("code", "audience") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "subscription_plans"
      WHERE ("code", "audience") IN (
        ('free', 'patient'), ('basic', 'patient'), ('premium', 'patient'),
        ('free', 'provider'), ('professional', 'provider')
      )
    `);
  }
}
