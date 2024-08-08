<script setup>
import { computed, ref, watch, defineExpose } from "vue";
import { rules } from "@/utils/utils.mjs";
import { useAddressesStore } from '@/stores/addresses';
import GoogleAutocomplete from "@/components/shared/GoogleAutocomplete.vue";
import { useMiscStore } from "@/stores/misc";
import {useUserStore} from '@/stores/user';

const addressStore = useAddressesStore();
const miscStore = useMiscStore();
const userStore = useUserStore();
const { validate } = rules;

// Data & Refs
const valid = ref(true);
const formTitle = ref('Add Address');
const addressForm = ref(null);
const googleAutocomplete = ref(null);

// Computed
const formDisabled = computed(() => addressStore.dialog.disabled);
const postalState = computed({
    get() {
        return addressStore.dialog.postalLocations.selected;
    },
    set(val) {
        addressStore.dialog.postalLocations.selected = val;
    }
})
const postalLocations = computed(() => addressStore.dialog.postalLocations.options
    .filter(item => (addressStore.dialog.postalLocations.selectedTypeId === item['custrecord_noncust_location_type']) || item['internalid'] === addressStore.dialog.form.custrecord_address_ncl))
const validateAutofillFields = computed(() => {
    return !!addressStore.dialog.form.custrecord_address_lat ||
        !!addressStore.dialog.form.custrecord_address_lon ||
        !!addressStore.dialog.form.addr2 ||
        !!addressStore.dialog.form.zip ||
        !!addressStore.dialog.form.state ||
        !!addressStore.dialog.form.city ||
        'Please fill in this field using one of the address suggestions';
})

// Methods
function handleAddressTypeChanged() {
    postalState.value = 0;
    addressStore.handleAddressTypeChanged();
    addressForm.value.resetValidation();
}

function handlePlaceChanged(googlePlace) {
    addressStore.dialog.form.custrecord_address_lat = '';
    addressStore.dialog.form.custrecord_address_lon = '';
    addressStore.dialog.form.addr2 = '';
    addressStore.dialog.form.zip = '';
    addressStore.dialog.form.state = '';
    addressStore.dialog.form.city = '';

    if (!googlePlace) return;

    addressStore.dialog.form.custrecord_address_lat = googlePlace?.geometry?.location?.lat();
    addressStore.dialog.form.custrecord_address_lon = googlePlace?.geometry?.location?.lng();

    let address2 = "";

    for (let addressComponent of googlePlace.address_components) {

        if (addressComponent.types[0] === 'street_number' || addressComponent.types[0] === 'route') {
            address2 += addressComponent['short_name'] + " ";
            addressStore.dialog.form.addr2 = address2;
        }
        if (addressComponent.types[0] === 'postal_code') {
            addressStore.dialog.form.zip = addressComponent['short_name'];
        }
        if (addressComponent.types[0] === 'administrative_area_level_1') {
            addressStore.dialog.form.state = addressComponent['short_name'];
        }
        if (addressComponent.types[0] === 'locality') {
            addressStore.dialog.form.city = addressComponent['short_name'];
        }
    }

    addressForm.value.validate();
}

async function saveAddress() {
    const { valid } = await addressForm.value.validate();
    if (!valid) return false;
    await addressStore.saveAddress();
    return true;
}

defineExpose({saveAddress});

// Watch
watch(() => addressStore.dialog.open, (val) => {
    if (val && addressStore.dialog.addressType === 'street') {
        if (addressStore.dialog.form.internalid >= 0 && addressStore.dialog.form.internalid !== null)
            googleAutocomplete.value.setInput(`${addressStore.dialog.form.addr2.trim()}, ${addressStore.dialog.form.city} ${addressStore.dialog.form.state}`)
        else googleAutocomplete.value.clearInput();
    }
})

</script>

<template>
    <v-container>
        <v-form ref="addressForm" v-model="valid" lazy-validation :disabled="formDisabled">
            <v-row justify="center">
                <v-col cols="12"><p class="text-h5 text-center">{{ formTitle }}</p></v-col>

                <v-col cols="12">
                    <v-text-field label="Company Name" v-model="addressStore.dialog.form.addressee"
                                  density="compact" variant="underlined" color="primary"
                                  :rules="[v => validate(v, 'required|minLength:3')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="5">
                    <v-autocomplete label="Address Type"
                                    density="compact" variant="underlined" color="primary"
                                    v-model="addressStore.dialog.addressType" autocomplete="off"
                                    :items="addressStore.dialog.addressTypeOptions"
                                    @change="handleAddressTypeChanged"
                                    :rules="[v => validate(v, 'required')]"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="7">
                    <v-text-field :label="addressStore.dialog.addressType === 'street' ? 'Suite/Level/Unit' : 'Postal Box'"
                                  v-model="addressStore.dialog.form.addr1"
                                  density="compact" variant="underlined" color="primary"
                                  :rules="[v => validate(v, addressStore.dialog.addressType === 'street' ? '' : 'required')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="12" v-show="addressStore.dialog.addressType === 'street'">
                    <GoogleAutocomplete label="Street No. & Name" ref="googleAutocomplete"
                                        density="compact" :variant="'underlined'" :clearable="true" color="primary"
                                        @place-changed="handlePlaceChanged"
                                        :rules="[() => addressStore.dialog.addressType === 'postal' || validateAutofillFields]" />
                </v-col>

                <v-col cols="3" v-if="addressStore.dialog.addressType === 'postal'">
                    <v-autocomplete label="State" autocomplete="off"
                                    :items="miscStore.states"
                                    v-model="addressStore.dialog.postalLocations.selectedStateId"
                                    @update:model-value="v => addressStore.getPostalLocationsByStateId(v)"
                                    :disabled="addressStore.dialog.postalLocations.busy"
                                    :loading="addressStore.dialog.postalLocations.busy"
                                    density="compact" variant="underlined" color="primary"
                                    :rules="[v => validate(v, 'required')]"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="3" v-if="addressStore.dialog.addressType === 'postal' && userStore.isAdmin">
                    <v-autocomplete label="Location Type" autocomplete="off"
                                    :items="miscStore.nonCustomerLocationTypes"
                                    v-model="addressStore.dialog.postalLocations.selectedTypeId"
                                    :disabled="addressStore.dialog.postalLocations.busy"
                                    :loading="addressStore.dialog.postalLocations.busy"
                                    density="compact" variant="underlined" color="primary"
                                    :rules="[v => validate(v, 'required')]"
                    ></v-autocomplete>
                </v-col>

                <v-col :cols="userStore.isAdmin ? 6 : 9" v-if="addressStore.dialog.addressType === 'postal'">
                    <v-autocomplete label="Postal Location" autocomplete="off"
                                    :items="postalLocations"
                                    v-model="addressStore.dialog.form.custrecord_address_ncl"
                                    @update:model-value="addressStore.handlePostalLocationChanged()"
                                    :disabled="addressStore.dialog.postalLocations.busy"
                                    :loading="addressStore.dialog.postalLocations.busy"
                                    density="compact" variant="underlined" color="primary"
                                    item-value="internalid" item-title="name"
                                    :rules="[v => validate(v, 'required')]"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="4">
                    <v-text-field label="City" v-model="addressStore.dialog.form.city"
                                  density="compact" variant="underlined" :disabled="true" color="primary"
                                  :rules="[v => validate(v, 'required')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="4" v-if="addressStore.dialog.addressType === 'street'">
                    <v-text-field label="State" v-model="addressStore.dialog.form.state"
                                  density="compact" variant="underlined" :disabled="true" color="primary"
                                  :rules="[v => validate(v, 'required')]"
                    ></v-text-field>
                </v-col>

                <v-col :cols="addressStore.dialog.addressType === 'street' ? 4 : 8">
                    <v-text-field :label="'Postcode' + (addressStore.dialog.addressType === 'postal' ? '/Mailing code' : '')"
                                  v-model="addressStore.dialog.form.zip"
                                  density="compact" variant="underlined" color="primary"
                                  :disabled="addressStore.dialog.addressType === 'street'"
                                  :rules="[v => validate(v, 'required')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-text-field label="Latitude" v-model="addressStore.dialog.form.custrecord_address_lat"
                                  density="compact" variant="underlined" :disabled="true" color="primary"
                                  :rules="[v => validate(v, 'required')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-text-field label="Longitude" v-model="addressStore.dialog.form.custrecord_address_lon"
                                  density="compact" variant="underlined" :disabled="true"
                                  color="primary"
                                  :rules="[v => validate(v, 'required')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="3">
                    <v-checkbox v-model="addressStore.dialog.form.defaultshipping"
                                density="compact"
                                color="primary"
                                label="Default Shipping"
                    ></v-checkbox>
                </v-col>

                <v-col cols="3">
                    <v-checkbox v-model="addressStore.dialog.form.defaultbilling"
                                density="compact"
                                color="primary"
                                label="Default Billing"
                    ></v-checkbox>
                </v-col>

                <v-col cols="3">
                    <v-checkbox v-model="addressStore.dialog.form.isresidential"
                                density="compact"
                                color="primary"
                                label="Postal Address"
                    ></v-checkbox>
                </v-col>

                <v-col cols="3">
                    <v-checkbox v-model="addressStore.dialog.form.isOldAddress"
                                density="compact"
                                color="primary"
                                label="Is Old Address"
                    ></v-checkbox>
                </v-col>
            </v-row>
        </v-form>
    </v-container>

</template>

<style scoped>

</style>