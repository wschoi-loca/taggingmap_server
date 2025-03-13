<template>
  <div id="app">
    <h1>Page Capture System</h1>
    <input type="file" @change="handleFileUpload" />
    <table v-if="pages.length">
      <thead>
        <tr>
          <th>SHOT_NUMBER</th>
          <th>EVENTNAME</th>
          <th>PAGEPATH</th>
          <th>PAGETITLE</th>
          <th>TIME</th>
          <th>LABEL_TEXT</th>
          <th>CATEGORY_DEPTH1</th>
          <th>CATEGORY_DEPTH2</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="page in pages" :key="page._id">
          <td>{{ page.SHOT_NUMBER }}</td>
          <td>{{ page.EVENTNAME }}</td>
          <td>{{ page.PAGEPATH }}</td>
          <td>{{ page.PAGETITLE }}</td>
          <td>{{ page.TIME }}</td>
          <td>{{ page.LABEL_TEXT }}</td>
          <td>{{ page.CATEGORY_DEPTH1 }}</td>
          <td>{{ page.CATEGORY_DEPTH2 }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',
  data() {
    return {
      pages: []
    };
  },
  created() {
    this.fetchPages();
  },
  methods: {
    async fetchPages() {
      try {
        const response = await axios.get('http://localhost:5000/api/pages');
        this.pages = response.data;
      } catch (error) {
        console.error('Error fetching pages:', error);
      }
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const jsonData = JSON.parse(e.target.result);
            await axios.post('http://localhost:5000/api/pages', jsonData);
            this.fetchPages(); // Refresh the pages after upload
          };
          reader.readAsText(file);
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
    }
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

table {
  margin: 0 auto;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ccc;
  padding: 10px;
}
</style>