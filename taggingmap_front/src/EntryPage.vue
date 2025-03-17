<template>
  <div id="entry-page">
    <h1>이벤트 리스트</h1>
    <div class="filter-section">
      <label>
        EVENTNAME 한글PAGETITLE:
        <input type="checkbox" v-model="filters.eventName" value="cts_view"> cts_view
        <input type="checkbox" v-model="filters.eventName" value="cts_click"> cts_click
        <input type="checkbox" v-model="filters.eventName" value="확인"> 확인
      </label>
      <label>
        PAGETITLE:
        <input v-model="filters.pageTitle" type="text" placeholder="페이지 제목 입력">
      </label>
      <label>
        PAGEPATH:
        <input v-model="filters.pagePath" type="text" placeholder="페이지 경로 입력">
      </label>
      <label>
        해시태그:
        <input v-model="filters.hashtag" type="text" placeholder="해시태그 입력">
      </label>
      <button @click="fetchData">선택</button>
    </div>

    <div class="data-list-section">
      <table class="data-table">
        <thead>
          <tr>
            <th>TIME</th>
            <th>EVENTNAME 한글PAGETITLE</th>
            <th>PAGETITLE</th>
            <th>PAGEPATH</th>
            <th>해시태그</th>
            <th>페이지 이동</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(event, index) in events" :key="index">
            <td>{{ event.time }}</td>
            <td>{{ event.eventName }}</td>
            <td>{{ event.pageTitle }}</td>
            <td>{{ event.pagePath }}</td>
            <td>{{ event.hashtag }}</td>
            <td><router-link :to="{ name: 'EventDetail', params: { id: event._id } }">상세</router-link></td>
          </tr>
        </tbody>
      </table>
      <button @click="loadMore">더보기</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      filters: {
        eventName: [],
        pageTitle: '',
        pagePath: '',
        hashtag: '',
      },
      events: [],
    };
  },
  methods: {
    async fetchData() {
      try {
        const response = await axios.get('http://localhost:5000/api/events', { params: this.filters });
        this.events = response.data;
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    },
    loadMore() {
      // 더보기 기능 구현
    }
  },
  mounted() {
    this.fetchData();
  },
};
</script>

<style>
#entry-page {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.filter-section, .data-list-section {
  margin: 20px;
}

.filter-section input {
  margin: 5px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
}

button {
  margin-top: 20px;
}
</style>