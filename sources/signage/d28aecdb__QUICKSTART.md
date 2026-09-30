# Quick-Start Guide — 5 Minutes to Your First Rendering

## 1. Five-Minute Setup

```bash
cd /home/ubuntu/scripts
bash setup.sh
python3 signage_cli.py --help     # should print the command list
```

That's it. The folder structure, logos, and tracker are already built — open
`/home/ubuntu/ON_THE_BOULEVARD/` and look around.

## 2. Your First Rendering (worked example: **Lola Pink**)

```bash
cd /home/ubuntu/scripts

# Step 1 — build the four scene prompts for this tenant
python3 signage_cli.py prompts --tenant "Lola Pink"

# Step 2 — render the hero storefront (daytime)
python3 signage_cli.py render --tenant "Lola Pink" --scene hero_storefront

# Step 3 — QC the result
python3 signage_cli.py qc --tenant "Lola Pink"

# Step 4 — if approved, move it to finals/
mv /home/ubuntu/ON_THE_BOULEVARD/TENANTS/111_Lola_Pink/renders/*hero*.png \
   /home/ubuntu/ON_THE_BOULEVARD/TENANTS/111_Lola_Pink/finals/
```

Open `PRODUCTION_TRACKER.xlsx → Rendering Status`, find the Lola Pink row, set
**Hero Storefront Status = Approved**, fill in the date.

## 3. Common Workflows

### Single tenant, all four scenes
```bash
for s in hero_storefront dusk_variant close_up streetscape; do
  python3 signage_cli.py render --tenant "Lola Pink" --scene $s
done
```

### Batch every tenant, hero only
```bash
python3 signage_cli.py render --all --scene hero_storefront
```

### Export an investor package
```bash
python3 signage_cli.py export --all --target investor
# → /home/ubuntu/ON_THE_BOULEVARD/PORTFOLIO_EXPORTS/investor_package_*.zip
```

### Add a brand-new tenant
1. Append the tenant to `/home/ubuntu/tenant_database.json`.
2. Run `python3 /home/ubuntu/build_otb.py`.
3. Add a row in the tracker.
4. Generate prompts → render → QC.

## 4. Where to Find Help

| Need | Open |
|------|------|
| Full workflow & CLI reference | `OPERATOR_GUIDE.md` |
| Architecture & data flow | `SYSTEM_ARCHITECTURE.md` |
| What's already built | `PROJECT_SUMMARY.md` |
| Folder map | `DIRECTORY_TREE.txt` |
| Prompt layer cheat sheet | `MASTER_PROMPTS/INDEX.md` |
| Run logs | `/home/ubuntu/scripts/logs/` |
