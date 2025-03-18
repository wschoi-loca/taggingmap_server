<template>
  <div id="app">
    <h1>태깅맵</h1>
    <div v-if="taggingMaps.length > 0">
      <div v-for="(group, pagetitle) in groupedData" :key="pagetitle" class="page-data">
        <h2>{{ pagetitle }}</h2>
        <div v-for="(eventGroup, eventname) in group" :key="eventname" class="event-group">
          <h3>{{ eventname }}</h3>
          <ImageThumbnail
            v-for="taggingMap in eventGroup"
            :key="taggingMap._id"
            :image="getImageUrl(taggingMap.image)"
            :id="taggingMap._id"
            @mouseover="showModal(taggingMap.image)"
          />
          <select v-model="selectedTime[pagetitle][eventname]">
            <option v-for="taggingMap in eventGroup" :key="taggingMap.TIME" :value="taggingMap.TIME">
              {{ taggingMap.TIME }}
            </option>
          </select>
          <select v-model="selectedUrl[pagetitle][eventname]">
            <option v-for="taggingMap in eventGroup" :key="taggingMap.URL" :value="taggingMap.URL">
              {{ taggingMap.URL }}
            </option>
          </select>
        </div>
      </div>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
    <ImageModal v-if="showModalImage" :image="modalImage" @close="closeModal" />
    <button @click="filterData">이동하기</button>
    <TaggingMapTable :filteredData="filteredData" />
  </div>
</template>

<script>
import axios from 'axios';
import ImageThumbnail from './components/ImageThumbnail.vue';
import ImageModal from './components/ImageModal.vue';
import TaggingMapTable from './components/TaggingMapTable.vue';

export default {
  name: 'App',
  components: {
    ImageThumbnail,
    ImageModal,
    TaggingMapTable
  },
  data() {
    return {
      taggingMaps: [],
      selectedTime: {},
      selectedUrl: {},
      showModalImage: false,
      modalImage: '',
      filteredData: []
    };
  },
  created() {
    this.fetchTaggingMaps();
  },
  methods: {
    async fetchTaggingMaps() {
      try {
        const response = await axios.get('http://localhost:5000/api/taggingMaps');
        this.taggingMaps = response.data;
        this.initializeSelections();
      } catch (error) {
        console.error('Error fetching taggingMaps:', error);
      }
    },
    getImageUrl(imagePath) {
      return imagePath ? `http://localhost:5000/${imagePath}` : '';
    },
    showModal(image) {
      this.modalImage = this.getImageUrl(image);
      this.showModalImage = true;
    },
    closeModal() {
      this.showModalImage = false;
      this.modalImage = '';
    },
    initializeSelections() {
      this.taggingMaps.forEach(taggingMap => {
        const pagetitle = taggingMap.PAGETITLE;
        const eventname = taggingMap.EVENTNAME;
        if (!this.selectedTime[pagetitle]) this.selectedTime[pagetitle] = {};
        if (!this.selectedUrl[pagetitle]) this.selectedUrl[pagetitle] = {};
        if (!this.selectedTime[pagetitle][eventname]) this.selectedTime[pagetitle][eventname] = taggingMap.TIME;
        if (!this.selectedUrl[pagetitle][eventname]) this.selectedUrl[pagetitle][eventname] = taggingMap.URL;
      });
    },
    filterData() {
      this.filteredData = this.taggingMaps.filter(taggingMap => {
        const pagetitle = taggingMap.PAGETITLE;
        const eventname = taggingMap.EVENTNAME;
        const time = this.selectedTime[pagetitle][eventname];
        const url = this.selectedUrl[pagetitle][eventname];
        return taggingMap.TIME === time && taggingMap.URL === url;
      });
    }
  },
  computed: {
    groupedData() {
      return this.taggingMaps.reduce((groups, taggingMap) => {
        const pagetitle = taggingMap.PAGETITLE;
        const eventname = taggingMap.EVENTNAME;
        if (!groups[pagetitle]) groups[pagetitle] = {};
        if (!groups[pagetitle][eventname]) groups[pagetitle][eventname] = [];
        groups[pagetitle][eventname].push(taggingMap);
        return groups;
      }, {});
    }
  }
};
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.page-data {
  margin-bottom: 20px;
}

.event-group {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

select {
  margin-left: 10px;
}

button {
  margin-top: 20px;
}
</style>