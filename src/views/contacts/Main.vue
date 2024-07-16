<script setup>
import {computed, ref} from 'vue';
import {useContactStore} from '@/stores/contacts';
import ContactFormDialog from '@/views/contacts/ContactFormDialog.vue';

const contactStore = useContactStore();
const headers = ref([
    { key: 'contact', title: 'Contact', align: 'start' },
    { key: 'admin', title: 'Portal Admin', align: 'center', sortable: false },
    { key: 'user', title: 'Portal User', align: 'center', sortable: false },
    { key: 'emailSent', title: 'Create Password Email Sent', align: 'center', sortable: false },
    { key: 'portal', title: 'Portal Activated', align: 'center', sortable: false },
    { key: 'actions', title: '', align: 'end', sortable: false }
]);

const toolbarMessage = computed(() => '');

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

                        <v-menu location="end">
                            <template v-slot:activator="{ props: menuActivator }">
                                <v-tooltip text="Re-send Create Portal Password Email" location="top">
                                    <template v-slot:activator="{ props: tooltipActivator }">
                                        <v-icon v-if="!parseInt(item.createPasswordEmailSent)" class="cursor-pointer"
                                                v-bind="{...tooltipActivator, ...menuActivator}" color="red">mdi-close-box-outline</v-icon>
                                    </template>
                                </v-tooltip>
                            </template>

                            <v-card class="bg-primary">
                                <v-card-item class="text-subtitle-2 pb-0">
                                    Permanently remove this contact?
                                </v-card-item>
                                <v-card-actions>
                                    <v-spacer></v-spacer>
                                    <v-btn class="text-none" size="small" color="red" variant="elevated">No</v-btn>
                                    <v-btn class="text-none" size="small" color="green" variant="elevated" @click="contactStore.resendCreatePortalPasswordEmail(item.internalid)">Yes</v-btn>
                                    <v-spacer></v-spacer>
                                </v-card-actions>
                            </v-card>
                        </v-menu>
                    </template>

                    <template v-slot:[`item.portal`]="{ item }">
                        <v-icon v-if="parseInt(item.accountActivated)" color="green">mdi-check</v-icon>
                        <v-icon v-else color="red">mdi-close</v-icon>
                    </template>

                    <template v-slot:[`item.actions`]="{ item }">
                        <v-card-actions class="pa-0">
                            <v-btn icon="mdi-pencil" color="primary" size="small" @click="contactStore.openDialog(true, item.internalid)"></v-btn>

                            <v-menu location="start">
                                <template v-slot:activator="{ props }">
                                    <v-btn v-bind="props" icon="mdi-delete" color="red" size="small"></v-btn>
                                </template>

                                <v-card class="bg-primary">
                                    <v-card-item class="text-subtitle-2 pb-0">
                                        Permanently remove this contact?
                                    </v-card-item>
                                    <v-card-actions>
                                        <v-spacer></v-spacer>
                                        <v-btn class="text-none" size="small" color="red" variant="elevated">No</v-btn>
                                        <v-btn class="text-none" size="small" color="green" variant="elevated" @click="contactStore.removeContact(item.internalid)">Yes</v-btn>
                                        <v-spacer></v-spacer>
                                    </v-card-actions>
                                </v-card>
                            </v-menu>

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