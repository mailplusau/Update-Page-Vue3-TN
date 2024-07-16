<script setup>
import {useContactStore} from '@/stores/contacts';
import { computed, ref } from "vue";
import { rules, getDialogWidth } from "@/utils/utils.mjs";
import {useUserStore} from '@/stores/user';
import {useMiscStore} from '@/stores/misc';
import {useDisplay} from 'vuetify';

const { validate } = rules;
const contactStore = useContactStore();
const userStore = useUserStore();
const miscStore = useMiscStore();
const contactForm = ref();

const portalAdmin = computed({
    get() {
        return parseInt(contactStore.dialog.form.custentity_connect_admin + '') === 1;
    },
    set(val) {
        contactStore.dialog.form.custentity_connect_admin = val ? 1 : 2;
    }
})

const portalUser = computed({
    get() {
        return parseInt(contactStore.dialog.form.custentity_connect_user + '') === 1;
    },
    set(val) {
        contactStore.dialog.form.custentity_connect_user = val ? 1 : 2;
    }
})

function handleContactRoleChanged() {
    if ([5, 6, 8].includes(parseInt(contactStore.dialog.form.contactrole))) { // if role is Mail/Parcel Operator, MPEX contact or Product Contact
        if (parseInt(contactStore.dialog.form.custentity_connect_user + '') !== 1) // then set Portal User to Yes (1)
            contactStore.dialog.form.custentity_connect_user = 1;

        // find at least 1 contact that is Portal Admin (1)
        let index = contactStore.data.findIndex(item => parseInt(item.custentity_connect_admin) === 1);

        // and if there's no contact set as Portal Admin (1), set this to Yes as well
        if (index < 0) contactStore.dialog.form.custentity_connect_admin = 1;
    }
}

async function save() {
    const { valid } = await contactForm.value['validate']();
    if (!valid) return false;
    contactStore.saveContact().then();
}
</script>

<template>
    <v-dialog v-model="contactStore.dialog.open" :width="getDialogWidth(useDisplay())">
        <v-card class="bg-background v-container v-container--fluid">
            <v-form ref="contactForm" lazy-validation>
                <v-row justify="center" >
                    <v-col cols="12"><p class="text-h5 text-center">{{ contactStore.dialog.title }}</p></v-col>

                    <v-col cols="6">
                        <v-text-field label="Firstname" v-model="contactStore.dialog.form.firstname"
                                      density="compact" variant="underlined" color="primary"
                                      :rules="[v => validate(v, 'required')]"
                        ></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field label="Lastname" v-model="contactStore.dialog.form.lastname"
                                      density="compact" variant="underlined" color="primary"
                                      :rules="[v => validate(v, 'required')]"
                        ></v-text-field>
                    </v-col>

                    <v-col cols="8">
                        <v-text-field label="Email" v-model="contactStore.dialog.form.email"
                                      density="compact" variant="underlined" color="primary"
                                      :rules="[v => validate(v, userStore.isFranchisee ? 'email' : 'required|email')]"
                        ></v-text-field>
                    </v-col>

                    <v-col cols="4">
                        <v-text-field label="Phone" v-model="contactStore.dialog.form.phone"
                                      density="compact" variant="underlined" color="primary"
                                      :rules="[v => validate(v, 'required|ausPhone')]"
                        ></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field label="Title/Position" v-model="contactStore.dialog.form.title"
                                      density="compact" variant="underlined" color="primary"
                                      placeholder="(optional)" persistent-placeholder
                        ></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-autocomplete label="Role"
                                        density="compact" variant="underlined" color="primary"
                                        v-model="contactStore.dialog.form.contactrole"
                                        :items="miscStore.roles"
                                        :rules="[v => validate(v, 'required')]"
                                        @update:model-value="handleContactRoleChanged"
                        ></v-autocomplete>
                    </v-col>

                    <v-col cols="6">
                        <v-checkbox v-model="portalAdmin"
                                    label="Portal Admin" color="primary"
                        ></v-checkbox>
                    </v-col>

                    <v-col cols="6">
                        <v-checkbox v-model="portalUser"
                                    label="Portal User" color="primary"
                        ></v-checkbox>
                    </v-col>

                    <v-col cols="auto">
                        <v-btn color="red darken-1" dark class="mx-3" @click="contactStore.dialog.open = false">
                            Cancel
                        </v-btn>
                        <v-btn color="green darken-1" dark class="mx-3" @click="save">
                            Save
                        </v-btn>
                    </v-col>
                </v-row>
            </v-form>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>