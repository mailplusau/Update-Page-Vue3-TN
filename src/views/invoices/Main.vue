<script setup>
import {ref} from 'vue';
import {useInvoiceStore} from '@/stores/invoices';
import {debounce, formatPrice} from '../../utils/utils.mjs';
import {useMainStore} from '@/stores/main';

const mainStore = useMainStore();
const invoiceStore = useInvoiceStore();
const headers = ref([
    {key: 'trandate', title: 'Invoice Date', align: 'center', sortable: true},
    {key: 'invoicenum', title: 'Invoice #', align: 'center', sortable: true},
    {key: 'statusref_text', title: 'Status', align: 'center', sortable: true},
    {key: 'custbody_inv_type_text', title: 'Type', align: 'center', sortable: true},
    {key: 'amountremaining', title: 'Due Amount', align: 'center', sortable: true},
    {key: 'total', title: 'Total Amount', align: 'center', sortable: true},
    {key: 'duedate', title: 'Due Date', align: 'center', sortable: true},
]);

const debouncedHandleInvoiceFiltersChanged = debounce(() => {
    invoiceStore.fetchInvoices();
}, 1000);

function handleInvoiceFiltersChanged() {
    debouncedHandleInvoiceFiltersChanged();
}
</script>

<template>
    <v-container v-if="mainStore.mode.value !== mainStore.mode.options.NEW">
        <v-row>
            <v-col cols="12">
                <v-data-table
                    :headers="headers"
                    :items="invoiceStore.data"
                    :loading="invoiceStore.busy"
                    no-data-text="No Invoice to Show"
                    :items-per-page="5"
                    class="elevation-5 bg-background"
                    :hide-default-footer="invoiceStore.data.length <= 10"
                    loading-text="Loading invoices..."
                    :cell-props="{ class: 'cell-text-size-11px' }"
                >
                    <template v-slot:top>
                        <v-toolbar density="compact" color="primary">
                            <h2 class="mx-4 font-weight-regular">Invoices</h2>

                            <v-divider vertical></v-divider>

                            <v-spacer></v-spacer>

                            <v-autocomplete variant="solo" density="compact" hide-details label="Status" bg-color="blue-grey" class="mx-1"
                                            v-model="invoiceStore.status.selected"
                                            :items="invoiceStore.status.options"
                                            @update:model-value="handleInvoiceFiltersChanged"></v-autocomplete>

                            <v-autocomplete variant="solo" density="compact" hide-details label="Period" bg-color="blue-grey" class="mx-1"
                                            v-model="invoiceStore.period.selected"
                                            :items="invoiceStore.period.options"
                                            @update:model-value="handleInvoiceFiltersChanged"></v-autocomplete>
                        </v-toolbar>
                    </template>

                    <template v-slot:[`item.trandate`]="{ item }">
                        {{item.trandate}}
                    </template>

                    <template v-slot:[`item.invoicenum`]="{item}">
                        <a target="_blank" :href="`https://1048144.app.netsuite.com/app/accounting/transactions/custinvc.nl?id=${item.internalid}&compid=1048144&cf=116&whence=`">
                            {{item.invoicenum.replace(/Invoice #([\w]+)/, '$1')}}
                        </a>
                    </template>

                    <template v-slot:[`item.statusref_text`]="{item}">
                        {{item.statusref_text}}
                    </template>

                    <template v-slot:[`item.custbody_inv_type_text`]="{item}">
                        {{item.custbody_inv_type_text}}
                    </template>

                    <template v-slot:[`item.amountremaining`]="{item}">
                        {{formatPrice(item.amountremaining)}}
                    </template>

                    <template v-slot:[`item.total`]="{item}">
                        {{formatPrice(item.total)}}
                    </template>

                    <template v-slot:[`item.duedate`]="{item}">
                        {{item.duedate}}<br>
                    </template>

                </v-data-table>
            </v-col>
        </v-row>
    </v-container>

</template>

<style scoped>

</style>