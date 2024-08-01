<script setup>
import {computed, ref} from 'vue';
import {useCustomerStore} from '@/stores/customer';
import {useMainStore} from '@/stores/main';
import {useLpoCampaignStore} from '@/stores/campaign-lpo';

const mainStore = useMainStore();
const lpoCampaign = useLpoCampaignStore();
const previewDialog = ref({
    img: '',
    open: false,
})

const filePreviews = computed(() => ({...useCustomerStore().photos.data}));

function previewFile(index) {
    previewDialog.value.img = filePreviews.value[index].url;
    previewDialog.value.open = true;
}

function closePreviewDialog() {
    previewDialog.value.img = null;
    previewDialog.value.open = false;
}
</script>

<template>
    <v-container v-if="mainStore.mode.value !== mainStore.mode.options.NEW && lpoCampaign.isActive && filePreviews.length">
        <v-row no-gutters>
            <v-col cols="12">
                <v-toolbar density="compact" color="primary" dark>
                    <h2 class="mx-4 font-weight-regular">Photos of the business</h2>
                    <v-divider vertical></v-divider>

                    <v-spacer></v-spacer>
                </v-toolbar>
                <v-card min-height="200px" class="bg-background main" elevation="5">
                    <v-container fluid v-if="false">
                        <v-row align="center">
                            <v-col v-for="(file, index) in filePreviews" :key="file.name" lg="3" md="3" sm="4" cols="12">
                                <v-card class="mx-auto fill-height" @click.stop="previewFile(index)" elevation="4">
                                    <v-img height="250" :src="file.url" class="white--text align-end"
                                           :gradient="'to bottom, rgba(0,0,0,0), rgba(0,0,0,.7)'">

                                        <v-card-title class="py-2 text-caption text-white">{{ file.name }}</v-card-title>
                                    </v-img>
                                </v-card>
                            </v-col>
                        </v-row>
                    </v-container>
                    <v-container v-else fluid style="min-height: 200px" class="fill-height">
                        <v-row justify="center" align="center" no-gutters>
                            <v-col cols="auto">
                                <v-icon size="50">mdi-image-multiple</v-icon>
                            </v-col>
                            <v-col cols="12" class="text-center subtitle-1">
                                <span>No photo to show</span>
                            </v-col>
                        </v-row>
                    </v-container>
                </v-card>
            </v-col>
        </v-row>


        <v-dialog
            v-model="previewDialog.open"
            fullscreen
            hide-overlay
            scrollable
            transition="dialog-bottom-transition"
        >
            <v-card class="bg-primary">
                <v-toolbar dark color="primary">
                    <v-toolbar-title>
                        Previewing Image
                    </v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-toolbar-items>
                        <v-btn color="yellow" variant="text" @click="closePreviewDialog">
                            Done & close
                        </v-btn>
                    </v-toolbar-items>
                </v-toolbar>

                <v-divider></v-divider>

                <v-img v-if="previewDialog.img && previewDialog.open" :src="previewDialog.img"></v-img>
            </v-card>
        </v-dialog>
    </v-container>

</template>

<style scoped>

</style>