<script setup>
import {computed} from 'vue';
import {useContactStore} from '@/stores/contacts';
import ContactFormDialog from '@/views/contacts/ContactFormDialog.vue';
import {useCustomerStore} from '@/stores/customer';
import ButtonWithConfirmationPopup from '@/components/shared/ButtonWithConfirmationPopup.vue';

const contactStore = useContactStore();
const customerStore = useCustomerStore();
const headers = computed(() => [
    { key: 'contact', title: 'Contact', align: 'start' },
    { key: 'admin', title: 'Portal Admin', align: 'center', sortable: false },
    { key: 'user', title: 'Portal User', align: 'center', sortable: false },

    ...(customerStore.id ? [
        { key: 'emailSent', title: 'Create Password Email Sent', align: customerStore.id ? 'center' : 'd-none', sortable: false },
        { key: 'portal', title: 'Portal Activated', align: 'center', sortable: false }
    ] : []),

    { key: 'actions', title: '', align: 'end', sortable: false }
])

const toolbarMessage = computed(() => '');

function getTncReminderMessage(contact) {
    return `Send T&C to <b class="text-secondary">${contact.firstname} ${contact.lastname}</b> `
        + `via the phone number <b class="text-secondary">${contact.phone}</b>?`
}

</script>

<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <v-data-table
                    :headers="headers"
                    :items="contactStore.data"
                    :loading="contactStore.busy"
                    no-data-text="No Contact to Show"
                    :items-per-page="-1"
                    class="elevation-5 bg-background"
                    :hide-default-footer="contactStore.data.length <= 10"
                    loading-text="Loading contacts..."
                    :cell-props="{ class: 'cell-text-size-11px' }"
                >
                    <template v-slot:top>
                        <v-toolbar density="compact" color="primary">
                            <h2 class="mx-4 font-weight-regular">Contacts</h2>
                            <v-divider vertical></v-divider>
                            <span class="mx-4 text-caption text-secondary">{{ toolbarMessage }}</span>

                            <v-spacer></v-spacer>

                            <v-btn variant="elevated" color="green" class="mr-2" size="small"
                                   @click="contactStore.openDialog()" :disabled="contactStore.busy">Add Contact</v-btn>
                        </v-toolbar>
                    </template>

                    <template v-slot:[`item.contact`]="{ item }">
                        <div class="py-1">
                            <b>{{ `${item.firstname} ${item.lastname}` }}</b><br>
                            <span>{{item.email}}</span>
                        </div>
                    </template>

                    <template v-slot:[`item.admin`]="{ item }">
                        <v-icon v-if="parseInt(item.custentity_connect_admin)" color="green">mdi-check</v-icon>
                        <v-icon v-else color="red">mdi-close</v-icon>
                    </template>

                    <template v-slot:[`item.user`]="{ item }">
                        <v-icon v-if="parseInt(item.custentity_connect_user)" color="green">mdi-check</v-icon>
                        <v-icon v-else color="red">mdi-close</v-icon>
                    </template>

                    <template v-slot:[`item.emailSent`]="{ item }">
                        <v-icon v-if="parseInt(item.createPasswordEmailSent)" color="green">mdi-check</v-icon>

                        <ButtonWithConfirmationPopup tooltip="Re-send Create Portal Password Email" message="Re-send Create Portal Password Email?"
                                                     @confirmed="contactStore.resendCreatePortalPasswordEmail(item.internalid)">
                            <template v-slot:activator="{ activatorProps }">
                                <v-icon v-if="!parseInt(item.createPasswordEmailSent)" class="cursor-pointer"
                                        v-bind="activatorProps" color="red">mdi-close-box-outline</v-icon>
                            </template>
                        </ButtonWithConfirmationPopup>
                    </template>

                    <template v-slot:[`item.portal`]="{ item }">
                        <v-icon v-if="parseInt(item.accountActivated)" color="green">mdi-check</v-icon>
                        <v-icon v-else color="red">mdi-close</v-icon>
                    </template>

                    <template v-slot:[`item.actions`]="{ item }">
                        <v-card-actions class="pa-0">
                            <v-btn icon="mdi-pencil" color="primary" size="small" @click="contactStore.openDialog(true, item.internalid)"></v-btn>

                            <ButtonWithConfirmationPopup tooltip="Send T&C Message via Contact's Phone number" :message="getTncReminderMessage(item)"
                                                         @confirmed="contactStore.sendTncReminder(item)">
                                <template v-slot:activator="{ activatorProps }">
                                    <v-btn v-bind="activatorProps" icon="mdi-message-text-outline" color="primary" size="small"></v-btn>
                                </template>
                            </ButtonWithConfirmationPopup>

                            <ButtonWithConfirmationPopup tooltip="Remove contact" message="Permanently remove this contact?"
                                                         @confirmed="contactStore.removeContact(item.internalid)">
                                <template v-slot:activator="{ activatorProps }">
                                    <v-btn v-bind="activatorProps" icon="mdi-delete" color="red" size="small"></v-btn>
                                </template>
                            </ButtonWithConfirmationPopup>
                        </v-card-actions>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>

        <ContactFormDialog />
    </v-container>
</template>

<style scoped>

</style>