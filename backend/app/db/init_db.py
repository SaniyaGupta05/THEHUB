import os
import json
import uuid
from datetime import datetime, timezone
from app.db.session import engine, Base, SessionLocal
from app.db.models import (
    DBCustomer,
    DBPointsTransaction,
    DBProduct,
    DBProductVariant,
    DBCollection,
    DBStaffUser,
    DBStaffInvoice,
    DBOrder,
    DBCart,
)

def init_db(reset_personas: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if reset_personas:
            db.query(DBPointsTransaction).delete()
            db.query(DBCustomer).delete()
            db.query(DBCart).delete()
            db.query(DBOrder).delete()
            db.commit()

        # 1. Seed Products & Variants if empty
        if db.query(DBProduct).count() == 0:
            data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
            products_file = os.path.join(data_dir, "sample_products.json")
            if os.path.exists(products_file):
                with open(products_file, "r", encoding="utf-8") as f:
                    prods = json.load(f)
                    for p in prods:
                        variants_data = p.pop("variants", [])
                        product = DBProduct(
                            id=p.get("id"),
                            title=p.get("title"),
                            handle=p.get("handle"),
                            description=p.get("description", ""),
                            vendor=p.get("vendor", "THE HUB"),
                            category=p.get("category", ""),
                            tags=p.get("tags", []),
                            price=float(p.get("price", 0.0)),
                            compare_at_price=float(p.get("compare_at_price")) if p.get("compare_at_price") else None,
                            is_sale=bool(p.get("is_sale", False)),
                            images=p.get("images", []),
                            available=bool(p.get("available", True)),
                            featured=bool(p.get("featured", False)),
                            is_new=bool(p.get("is_new", False)),
                            rating=float(p.get("rating", 4.8)),
                            review_count=int(p.get("review_count", 24)),
                        )
                        db.add(product)
                        db.flush()

                        for v in variants_data:
                            variant = DBProductVariant(
                                id=v.get("id"),
                                product_id=product.id,
                                title=v.get("title"),
                                sku=v.get("sku"),
                                price=float(v.get("price", 0.0)),
                                compare_at_price=float(v.get("compare_at_price")) if v.get("compare_at_price") else None,
                                available=bool(v.get("available", True)),
                                size=v.get("size"),
                                color=v.get("color"),
                            )
                            db.add(variant)

            # 2. Seed Collections
            collections_file = os.path.join(data_dir, "sample_collections.json")
            if os.path.exists(collections_file):
                with open(collections_file, "r", encoding="utf-8") as f:
                    cols = json.load(f)
                    for c in cols:
                        col = DBCollection(
                            id=c.get("id"),
                            title=c.get("title"),
                            handle=c.get("handle"),
                            description=c.get("description", ""),
                            image=c.get("image"),
                            product_count=int(c.get("product_count", 0)),
                        )
                        db.add(col)

        # 3. Seed Customers & Loyalty Accounts if empty
        if db.query(DBCustomer).count() == 0:
            data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
            loyalty_file = os.path.join(data_dir, "sample_loyalty_data.json")
            if os.path.exists(loyalty_file):
                with open(loyalty_file, "r", encoding="utf-8") as f:
                    ldata = json.load(f)
                    customers_data = ldata.get("customers", {})
                    accounts_data = ldata.get("loyalty_accounts", {})

                    for cid, c in customers_data.items():
                        acc = accounts_data.get(cid, {})
                        ms_str = c.get("member_since")
                        member_since_dt = (
                            datetime.fromisoformat(ms_str.replace("Z", "+00:00"))
                            if ms_str
                            else datetime.now(timezone.utc)
                        )

                        db_cust = DBCustomer(
                            id=cid,
                            first_name=c.get("first_name", ""),
                            last_name=c.get("last_name", ""),
                            email=c.get("email", ""),
                            phone=c.get("phone", ""),
                            member_since=member_since_dt,
                            is_hubklub_member=bool(c.get("is_hubklub_member", False)),
                            membership_number=c.get("membership_number"),
                            tier=c.get("tier") or "Classic",
                            max_single_purchase=float(c.get("max_single_purchase", 0.0)),
                            annual_spend_current_year=float(c.get("annual_spend_current_year", 0.0)),
                            lifetime_spend=float(c.get("lifetime_spend", 0.0)),
                            available_points=int(acc.get("available_points", 0)),
                            points_earned_current_year=int(acc.get("points_earned_current_year", 0)),
                            annual_bonus_awarded=bool(acc.get("annual_bonus_awarded", False)),
                            annual_bonus_points=int(acc.get("annual_bonus_points", 0)),
                            saved_addresses=c.get("saved_addresses", []),
                        )
                        db.add(db_cust)
                        db.flush()

                        for tx in acc.get("transactions", []):
                            ts_str = tx.get("timestamp")
                            ts_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00")) if ts_str else datetime.now(timezone.utc)
                            exp_str = tx.get("expiry_date")
                            exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00")) if exp_str else None

                            db_tx = DBPointsTransaction(
                                id=tx.get("id", f"tx_{uuid.uuid4().hex[:8]}"),
                                customer_id=cid,
                                type=tx.get("type", "earn"),
                                points=int(tx.get("points", 0)),
                                rupee_equivalent=float(tx.get("rupee_equivalent", 0.0)),
                                order_id=tx.get("order_id"),
                                description=tx.get("description", ""),
                                timestamp=ts_dt,
                                expiry_date=exp_dt,
                                status=tx.get("status", "Active"),
                            )
                            db.add(db_tx)

        # 4. Seed Staff Users if empty
        if db.query(DBStaffUser).count() == 0:
            staff_list = [
                DBStaffUser(
                    id="stf_01",
                    username="vadodara_staff",
                    password="Staff@123",
                    full_name="Kavita Sharma",
                    role="staff",
                    store_location="The HUB • Spentha Complex, Alkapuri, Vadodara",
                ),
                DBStaffUser(
                    id="stf_02",
                    username="admin",
                    password="Admin@123",
                    full_name="Rajesh Patel (Store Manager)",
                    role="manager",
                    store_location="The HUB • Spentha Complex, Alkapuri, Vadodara",
                ),
                DBStaffUser(
                    id="stf_03",
                    username="vadodara_admin",
                    password="Admin@123",
                    full_name="Rajesh Patel (Store Manager)",
                    role="manager",
                    store_location="The HUB • Spentha Complex, Alkapuri, Vadodara",
                ),
            ]
            for s in staff_list:
                db.add(s)

        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
