export const customer = {
    basic: {
        entityid: null,
        companyname: '',
        vatregnumber: '', // ABN
        custentity_website_page_url: '', // Website
        custentity_previous_carrier: '', // Previous carrier
        email: '', // Account (main) email
        altphone: '', // Account (main) phone
        custentity_email_service: '', // Day-to-day email
        phone: '', // Day-to-day phone
        custentity_industry_category: '19', // Industry, defaulted to Other Services (19)
        leadsource: '',
        partner: '', // Associated franchisee
        entitystatus: '6', // Customer status, defaulted to SUSPECT - New (6)
        custentity_old_zee: '', // Old franchisee (use for Change of Entity or Relocation stats)
        custentity_old_customer: '', // Former internal id (use for Change of Entity or Relocation stats)
        custentity_new_zee: '',
        custentity_new_customer: '',

        custentity_mp_toll_salesrep: '', // Account Manager ID

        custentity_maap_bankacctno: null,
        custentity_maap_bankacctno_parent: null,

        custentity_date_lead_entered: new Date(), // Date when the lead is entered, default to today

        custentity_invoice_by_email: true, // Invoice by email
        custentity18: true, // EXCLUDE FROM BATCH PRINTING

        custentity_operation_notes: '', // Note from the franchisee for this lead

        custentity_portal_access: '', // 1: Yes | 2: No
        custentity_portal_access_date: '', // Portal Access Change Date
    },

    miscInfo: {
        custentity_invoice_method: null, // Invoice method
        custentity_accounts_cc_email: null, // Account CC email
        custentity_mpex_po: null, // MPEX PO
        custentity11: null, // Customer PO number
        custentity_mpex_invoicing_cycle: null, // Invoice cycle ID
        terms: null, // Term(?)
        custentity_finance_terms: null, // Customer's Term
        custentity_customer_pricing_notes: '', // Pricing Notes
        custentity_portal_cc_payment: '', // Portal Credit Card Payment
    },

    mpProducts: {
        custentity_mpex_customer: false, // is MPEX Customer
        custentity_exp_mpex_weekly_usage: null, // MPEX Expected Usage
        custentity_form_mpex_usage_per_week: null, // MPEX Weekly Usage
    },

    surveyInfo: {
        custentity_category_multisite: null, // is Multisite
        custentity_category_multisite_link: '', // Multisite Link
        custentity_mp_toll_zeevisit: null, // is Visited by Franchisee
        custentity_mp_toll_zeevisit_memo: '', // Franchisee Visit Note
        custentity_ap_mail_parcel: null, // is Using Mail/Parcel/Satchel Regularly
        custentity_customer_express_post: null, // is Using Express Post
        custentity_customer_local_couriers: null, // is Using Local Couriers
        custentity_customer_po_box: null, // is Using PO Box
        custentity_customer_bank_visit: null, // is Using Bank Visit
        custentity_lead_type: null, // Lead Type or Classify Lead
    }
};

export const customerMiscInfo = {
    custentity_invoice_method: null, // Invoice method
    custentity_accounts_cc_email: null, // Account CC email
    custentity_mpex_po: null, // MPEX PO
    custentity11: null, // Customer PO number
    custentity_mpex_invoicing_cycle: null, // Invoice cycle ID
    terms: null, // Term(?)
    custentity_finance_terms: null, // Customer's Term
    custentity_customer_pricing_notes: '', // Pricing Notes
    custentity_portal_cc_payment: '', // Portal Credit Card Payment
}

export const franchisee = {
    companyname: null, // Franchisee name
    custentity3: null, // Main contact name
    email: null, // Franchisee email
    custentity2: null, // Main contact phone
    custentity_abn_franchiserecord: null, // Franchise ABN
}

export const contact = {
    internalid: null,
    salutation: '',
    firstname: '',
    lastname: '',
    phone: '',
    email: '',
    contactrole: '',
    title: '',
    company: null, // internal id of customer record
    entityid: '',
    custentity_connect_admin: 2,
    custentity_connect_user: 2,
};

export const address = { // address fields and default values
    addr1: '',
    addr2: '',
    city: '',
    state: '',
    zip: '',
    country: 'AU',
    addressee: '', // company name
    custrecord_address_lat: '',
    custrecord_address_lon: '',
    custrecord_address_ncl: '',
};

export const addressSublist = { // address sublist fields and default values
    internalid: null,
    label: '',
    defaultshipping: false,
    defaultbilling: false,
    isresidential: false,
}

export const ncLocation = {
    name: '',
    internalid: '',
    custrecord_ap_lodgement_addr1: '',
    custrecord_ap_lodgement_addr2: '',
    custrecord_ap_lodgement_lat: '',
    custrecord_ap_lodgement_long: '',
    custrecord_ap_lodgement_postcode: '',
    custrecord_ap_lodgement_site_phone: '',
    custrecord_ap_lodgement_site_state: '', // getText for this one
    custrecord_ap_lodgement_suburb: '',
    custrecord_ap_lodgement_supply: false,
    custrecord_ncl_monthly_fee: '',
    custrecord_ncl_site_access_code: '',
    custrecord_noncust_location_type: '', // getText for this one too
}