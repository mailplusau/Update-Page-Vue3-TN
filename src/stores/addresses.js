import { defineStore } from "pinia";
import {address as addressFields, addressSublist as addressSublistFields, ncLocation} from '@/utils/defaults.mjs';
import { useCustomerStore } from "@/stores/customer";
import { useMiscStore} from "@/stores/misc";
import http from "@/utils/http.mjs";
import { useGlobalDialog } from "@/stores/global-dialog";

let localId = 1;
let customerStore, globalDialog, miscStore;
const oldAddressLabel = 'Old Address';

const state = {
    data: [],
    busy: false,

    dialog: {
        open: false,
        form: {},
        busy: false,
        disabled: false,

        addressType: 'street',
        addressTypeOptions: [
            {value: 'street', title: 'Street Address'},
            {value: 'postal', title: 'Postal Address'},
        ],

        postalLocations: {
            selectedStateId: null,
            options: [],
            busy: false,
            form: { ...ncLocation },
        },
    },
    address: {...addressFields, isOldAddress: false,},
    addressSublist: {...addressSublistFields},
};

state.dialog.form = {...state.address, ...state.addressSublist, addressee: ''};

const getters = {

};

const actions = {
    async init() {
        customerStore = useCustomerStore();
        globalDialog = useGlobalDialog();
        miscStore = useMiscStore();

        if (!customerStore.id) return this.restoreStateFromLocalStorage();
        
        await _fetchAddresses(this);
    },
    resetAddressForm() {
        this.dialog.form = {...this.address, ...this.addressSublist, addressee: customerStore.form.data.companyname || ''};
    },
    async openDialog(open = true, addressId = null) {
        this.dialog.open = open;

        if (open) {
            let index = this.data.findIndex(item => item.internalid === addressId);
            this.dialog.busy = true;
            this.dialog.title = index >= 0 ? `Edit Contact Id #${addressId}` : 'Add Address';

            if (index >= 0) { // Index exists, edit mode
                this.dialog.form = {...this.data[index]};

                if (this.data[index].custrecord_address_ncl) { // This is postal address, we need to load postal locations
                    this.dialog.addressType = 'postal';
                    let stateIndex = miscStore.states.findIndex(item => item.title === this.data[index].state);
                    this.dialog.postalLocations.selectedStateId = stateIndex >= 0 ? miscStore.states[stateIndex].value : 0;
                    await this.getPostalLocationsByStateId(this.dialog.postalLocations.selectedStateId);
                } else this.dialog.addressType = 'street';

            } else this.resetAddressForm();

            this.dialog.busy = false;
        }
    },
    handleAddressTypeChanged() {
        console.log('handleAddressTypeChanged')
        // reset the form but preserve internal id (if any) to prevent a new address from being created in case of edit mode
        let index = this.data.findIndex(item => item.internalid === this.dialog.form.internalid);
        this.resetAddressForm();

        // Check and preserve internal id (if any)
        if (index >= 0) this.dialog.form.internalid = this.data[index].internalid;
    },
    async getPostalLocationsByStateId(postalStateId) {
        this.dialog.postalLocations.busy = true;

        if (miscStore.states.findIndex(item => item.value === postalStateId) >= 0) {
            let data = await http.get('getPostalLocationOptions', { postalStateId });

            this.dialog.postalLocations.options = Array.isArray(data) ? [...data] : [];
            // this.dialog.form.custrecord_address_ncl = '';
            // this.dialog.form.state = '';
            // this.dialog.form.city = '';
            // this.dialog.form.zip = '';
            // this.dialog.form.custrecord_address_lat = '';
            // this.dialog.form.custrecord_address_lon = '';
        } else console.error('state index ' + postalStateId + ' is invalid');

        this.dialog.postalLocations.busy = false;
    },
    handlePostalLocationChanged() {
        let index = this.dialog.postalLocations.options
          .findIndex(item => item.internalid === this.dialog.form.custrecord_address_ncl);

        if (index < 0) return;

        let postalLocation = this.dialog.postalLocations.options[index];
        this.dialog.form.state = postalLocation.custrecord_ap_lodgement_site_state;
        this.dialog.form.city = postalLocation.custrecord_ap_lodgement_suburb;
        this.dialog.form.zip = postalLocation.custrecord_ap_lodgement_postcode;
        this.dialog.form.custrecord_address_lat = postalLocation.custrecord_ap_lodgement_lat;
        this.dialog.form.custrecord_address_lon = postalLocation.custrecord_ap_lodgement_long;
    },
    async saveAddress() {
        console.log('saveAddress in address.js module')
        globalDialog.displayBusy('Processing', 'Saving address. Please wait...')

        // check if there's any default shipping. If not, set the current address in form as default shipping.
        // otherwise, check if the current address in form is set as default shipping, then un-default the previous default shipping.
        let currentShippingAddressIndex = this.data
          .findIndex(item => (item.defaultshipping && item.internalid !== this.dialog.form.internalid));

        if (currentShippingAddressIndex < 0)
            this.dialog.form.defaultshipping = true;  // check if there's any default shipping
        else if (this.dialog.form.defaultshipping && currentShippingAddressIndex >= 0) {
            this.data.splice(currentShippingAddressIndex, 1, {...this.data[currentShippingAddressIndex], defaultshipping: false})
            _setLocalAddressLabel(this.data[currentShippingAddressIndex]);
        }

        // check if there's any default billing. If not, set the current address in form as default billing.
        // otherwise, check if the current address in form is set as default billing, then un-default the previous default billing.
        let currentBillingAddressIndex = this.data
          .findIndex(item => (item.defaultbilling && item.internalid !== this.dialog.form.internalid));

        if (currentBillingAddressIndex < 0)
            this.dialog.form.defaultbilling = true;
        else if (this.dialog.form.defaultbilling && currentBillingAddressIndex >= 0) {
            this.data.splice(currentBillingAddressIndex, 1, {...this.data[currentBillingAddressIndex], defaultbilling: false})
            _setLocalAddressLabel(this.data[currentBillingAddressIndex]);
        }

        _setLocalAddressLabel(this.dialog.form);

        if (customerStore.id) { // save addresses to NetSuite
            // eslint-disable-next-line no-unused-vars
            let {isOldAddress, ...addressData} = this.dialog.form;
            let addressArray = [{...addressData}];
            if (currentBillingAddressIndex >= 0) addressArray.push({...this.data[currentBillingAddressIndex]});
            if (currentShippingAddressIndex >= 0) addressArray.push({...this.data[currentShippingAddressIndex]});

            await http.post('saveAddress', {customerId: customerStore.id, addressArray});

            await _fetchAddresses(this);
        } else { // or save it to local
            if (this.dialog.form.internalid !== null && this.dialog.form.internalid >= 0) {
                let currentIndex = this.data.findIndex(item => item.internalid === this.dialog.form.internalid);

                this.data.splice(currentIndex, 1, {...this.dialog.form})

            } else this.data.push({...this.dialog.form, internalid: localId++});

            this.saveStateToLocalStorage();
        }

        await _fetchAddresses(this);

        this.resetAddressForm();

        globalDialog.close();
    },
    async removeAddress(addressInternalId) {
        if (!addressInternalId) return;

        globalDialog.displayBusy('Processing', 'Removing address. Please wait...');

        if (customerStore.id) {
            await http.post('deleteAddress', {
                customerId: customerStore.id,
                addressInternalId
            });
            
            await _fetchAddresses(this);
        } else {
            let index = this.data.findIndex(item => item.internalid === addressInternalId);
            if (index >= 0) this.data.splice(index, 1);
            this.saveStateToLocalStorage();
        }

        globalDialog.close();
    },

    saveStateToLocalStorage() {
        if (customerStore.id) return;

        top.localStorage.setItem("1900_addresses", JSON.stringify(this.data));
    },
    clearStateFromLocalStorage() {
        top.localStorage.removeItem("1900_addresses");
    },
    restoreStateFromLocalStorage() {
        if (customerStore.id) return;

        try {
            let data = JSON.parse(top.localStorage.getItem("1900_addresses"));
            if (Array.isArray(data)) this.data = [...data];
        } catch (e) {
            console.log('No stored data found')
        }
    }
};

async function _fetchAddresses(ctx) {
    if (!customerStore?.id) return;

    ctx.busy = true;
    let data = await http.get('getCustomerAddresses', {
        customerId: customerStore.id
    });

    ctx.data.splice(0);
    data.forEach(item => {
        ctx.data.push({...item, isOldAddress: item.label === oldAddressLabel})
    })
    ctx.busy = false;
}

function _setLocalAddressLabel(addressObject) {
    if (addressObject.isOldAddress) {
        addressObject.label = oldAddressLabel;
    } else if (addressObject.defaultshipping) {
        addressObject.label = 'Site Address';
    } else if (addressObject.defaultbilling) {
        addressObject.label = 'Billing Address';
    } else if (addressObject.isresidential) {
        addressObject.label = 'Postal Address';
    } else {
        addressObject.label = 'Alternative Sender';
    }
}

export const useAddressesStore = defineStore('addresses', {
    state: () => state,
    getters,
    actions,
});
