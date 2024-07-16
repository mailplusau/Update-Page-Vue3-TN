<script setup>
import { useAddressesStore } from '@/stores/addresses';
import {computed, ref} from 'vue';
import AddressFormDialog from "@/views/addresses/AddressFormDialog.vue";

const addressStore = useAddressesStore();
const headers = ref([
    { key: 'address', title: 'Address', align: 'start' },
    { key: 'label', title: 'Label', align: 'center', sortable: false },
    { key: 'shipping', title: 'Default Shipping', align: 'center', sortable: false },
    { key: 'billing', title: 'Default Billing', align: 'center', sortable: false },
    { key: 'geocoded', title: 'Geocoded', align: 'center', sortable: false },
    { key: 'actions', title: '', align: 'end', sortable: false }
]);
const toolbarMessage = computed(() => {
    let noShippingAddress = !addressStore.data.filter(item => item.defaultshipping).length;
    let noBillingAddress = !addressStore.data.filter(item => item.defaultbilling).length;
    let str = '';
    str += (noShippingAddress || noBillingAddress) ? 'Please add ' : '';
    str += (noShippingAddress) ? 'shipping ' : '';
    str += (noShippingAddress && noBillingAddress) ? 'and ' : '';
    str += (noBillingAddress) ? 'billing ' : '';
    str += (noShippingAddress || noBillingAddress) ? 'address.' : '';

    return str;
})
</script>

<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <v-data-table
                    :headers="headers"
                    :items="addressStore.data"
                    :loading="addressStore.busy"
                    no-data-text="No Address to Show"
                    :items-per-page="-1"
                    class="elevation-5 bg-background"
                    :hide-default-footer="addressStore.data.length <= 10"
                    loading-text="Loading addresses..."
                    :cell-props="{ class: 'cell-text-size-11px' }"
                >
                    <template v-slot:top>
                        <v-toolbar density="compact" color="primary">
                            <h2 class="mx-4 font-weight-regular">Addresses</h2>
                            <v-divider vertical></v-divider>
                            <span class="mx-4 text-caption text-secondary">{{ toolbarMessage }}</span>

                            <v-spacer></v-spacer>

                            <v-btn variant="elevated" color="green" class="mr-2" size="small"
                                   @click="addressStore.openDialog()" :disabled="addressStore.busy">Add Address</v-btn>
                        </v-toolbar>
                    </template>

                    <template v-slot:[`item.address`]="{ item }">
                        {{ `${item.addr1} ${item.addr2}, ${item.city} ${item.state} ${item.zip}` }}
                    </template>

                    <template v-slot:[`item.shipping`]="{ item }">
                        <v-icon :color="item.defaultshipping ? 'green' : 'red'">
                            {{ item.defaultshipping ? 'mdi-check' : 'mdi-close' }}
                        </v-icon>
                    </template>

                    <template v-slot:[`item.billing`]="{ item }">
                        <v-icon :color="item.defaultbilling ? 'green' : 'red'">
                            {{ item.defaultbilling ? 'mdi-check' : 'mdi-close' }}
                        </v-icon>
                    </template>

                    <template v-slot:[`item.geocoded`]="{ item }">
                        {{ item.custrecord_address_lat && item.custrecord_address_lon ? 'Yes' : 'No' }}
                    </template>

                    <template v-slot:[`item.actions`]="{ item }">
                        <v-card-actions>
                            <v-btn icon="mdi-pencil" size="small" color="primary" @click="addressStore.openDialog(true, item.internalid)"></v-btn>

                            <v-menu location="start">
                                <template v-slot:activator="{ props }">
                                    <v-btn v-bind="props" icon="mdi-delete" color="red" size="small"></v-btn>
                                </template>

                                <v-card class="bg-primary">
                                    <v-card-item class="text-subtitle-2 pb-0">
                                        Permanently remove this address?
                                    </v-card-item>
                                    <v-card-actions>
                                        <v-spacer></v-spacer>
                                        <v-btn class="text-none" size="small" color="red" variant="elevated">No</v-btn>
                                        <v-btn class="text-none" size="small" color="green" variant="elevated" @click="addressStore.removeAddress(item.internalid)">Yes</v-btn>
                                        <v-spacer></v-spacer>
                                    </v-card-actions>
                                </v-card>
                            </v-menu>

                        </v-card-actions>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>

        <AddressFormDialog />
    </v-container>
</template>

<style scoped></style>
