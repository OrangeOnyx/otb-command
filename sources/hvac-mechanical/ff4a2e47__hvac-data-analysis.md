# HVAC Data Analysis

## Columns
1. Unit (number or string like "135A")
2. SF (square footage)
3. Tenant name
4. Enhanced_Business_Description
5. HVAC SPLIT (lease responsibility text: "$X per occurrence and $Y Replacement")
6. HVAC Replacements (text with dates and costs of replacements)
7. Butcher HVAC Contracts (number = count of maintenance contracts)
8-10. AGE OF HVAC SYSTEMS 2020 (up to 3 HVAC units per tenant, format: "PKG Unit YYYY" or "RES Split YYYY" or "COM Split YYYY")

## Key Data Points Per Unit
- Unit number
- Tenant name
- HVAC split/responsibility (lease language)
- Replacement history (date + cost)
- Number of maintenance contracts
- HVAC system type + install year (up to 3 systems)

## HVAC System Types
- PKG Unit = Package Unit (rooftop)
- RES Split = Residential Split System
- COM Split = Commercial Split System

## Data Rows: 27 units (rows 2-28)
