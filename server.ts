import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

// Define DEFAULT_TESTS directly to avoid import issues or dependency cycles
const DEFAULT_TESTS = [
  {
    id: 'ege-rus-sample-1',
    title: 'ЕГЭ: Орфоэпия и нормы орфографии',
    description: 'Тренировочный тест по заданиям 4, 5, 9, 10, 11 и 15 ЕГЭ по русскому языку. Проверка ударений, паронимов и правил правописания.',
    systemType: 'EGE',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q1',
        number: 4,
        type: 'single',
        text: 'Укажите варианты ответов, в которых ВЕРНО выделена буква, обозначающая ударный гласный звук. Запишите номера этих ответов.',
        options: [
          '1) квартАл',
          '2) звонИт',
          '3) тОрты',
          '4) красИвее',
          '5) согнУтый'
        ],
        correctAnswer: '1,2,3,4',
        points: 1
      },
      {
        id: 'q2',
        number: 5,
        type: 'text',
        text: 'В одном из приведённых ниже предложений НЕВЕРНО употреблено выделенное слово. Исправьте лексическую ошибку, подобрав к выделенному слову пароним. Запишите подобранное слово.\n\n- Он человек ПРАКТИЧНЫЙ и не тратит деньги впустую.\n- Нас ждал СЫТНЫЙ обед в уютном кафе.\n- В лесу послышался ДВОЙНОЙ шорох.\n- Почва в этом регионе оказалась очень ГЛИНИСТОЙ.',
        correctAnswer: 'двойной',
        points: 1
      },
      {
        id: 'q3',
        number: 9,
        type: 'single',
        text: 'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.\n\n1) заг..рать, к..саться, изл..жение\n2) р..стение, м..кать (в воду), соб..рать\n3) ст..рать, б..речь, прим..рять (костюм)\n4) р..скошный, к..мпонент, уг..реть\n5) б..леть, заж..гать, б..рюзовый',
        options: [
          'Вариант 1',
          'Вариант 2',
          'Вариант 3',
          'Вариант 4',
          'Вариант 5'
        ],
        correctAnswer: '1,4',
        points: 1
      },
      {
        id: 'q4',
        number: 10,
        type: 'single',
        text: 'Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква. Запишите номера ответов.\n\n1) пр..открыть, пр..вокзальный, пр..морский\n2) бе..вкусный, ра..дать, и..подлобья\n3) по..писать, о..дать, на..кусить\n4) пр..градить, пр..одолеть, пр..красный\n5) с..играть, без..мянный, под..тожить',
        options: [
          '1) пр..открыть, пр..вокзальный, пр..морский (И)',
          '2) бе..вкусный (З), ра..дать (З), и..подлобья (С)',
          '3) по..писать (Д), о..дать (Т), на..кусить (Д)',
          '4) пр..градить (Е), пр..одолеть (Е), пр..красный (Е)',
          '5) с..играть (Ы), без..мянный (Ы), под..тожить (Ы)'
        ],
        correctAnswer: '1,4,5',
        points: 1
      },
      {
        id: 'q5',
        number: 15,
        type: 'single',
        text: 'Укажите все цифры, на месте которых пишется одна буква Н (Н).\n\nКраше(1)ый масляной краской пол был уставлен деревя(2)ыми столами, на которых лежали свежевыпече(3)ые караваи хлеба и пореза(4)ая ветчина.',
        options: [
          '1, 3',
          '1',
          '1, 2, 3',
          '2, 4'
        ],
        correctAnswer: '1',
        points: 1
      }
    ]
  },
  {
    id: 'oge-rus-sample-1',
    title: 'ОГЭ: Синтаксис и пунктуационный анализ',
    description: 'Тренировочный тест по заданиям 3, 4 и 5 ОГЭ по русскому языку. Включает пунктуационный разбор предложения и синтаксический анализ словосочетания.',
    systemType: 'OGE',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q1-oge',
        number: 3,
        type: 'text',
        text: 'Расставьте знаки препинания. Укажите цифры, на месте которых должны стоять запятые.\n\nАлексей (1) утомленный длинной дорогой (2) сразу же уснул (3) несмотря на шум (4) доносившийся со двора.',
        correctAnswer: '1,2,3,4',
        points: 1
      },
      {
        id: 'q2-oge',
        number: 4,
        type: 'text',
        text: 'Замените словосочетание «ХРУСТАЛЬНАЯ ВАЗА», построенное на основе согласования, синонимичным словосочетанием со связью УПРАВЛЕНИЕ. Напишите получившееся словосочетание (без пробелов и знаков препинания, в нижнем или верхнем регистре).',
        correctAnswer: 'вазаизхрусталя',
        points: 1
      },
      {
        id: 'q3-oge',
        number: 6,
        type: 'single',
        text: 'Орфографический анализ. Укажите варианты ответов, в которых дано ВЕРНОЕ объяснение написания выделенного слова.\n\n1) БЕЗБОЛЕЗНЕННЫЙ — на конце приставки перед буквой, обозначающей звонкий согласный звук, пишется буква З.\n2) РЕШЁННАЯ (задача) — в суффиксе краткого страдательного причастия прошедшего времени пишется НН.\n3) ЦЫГАНСКИЙ — в корне слова после Ц пишется буква Ы (исключение).\n4) СТЕРЕЧЬ — на конце глагола в повелительном наклонении после шипящих пишется буква Ь.\n5) ПРИШКОЛЬНЫЙ — приставка ПРИ- пишется в значении неполноты действия.',
        options: [
          '1, 3',
          '1, 2, 3',
          '3, 4',
          '1, 5'
        ],
        correctAnswer: '1,3',
        points: 1
      }
    ]
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Read Firebase Config
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Initialize Firebase App
  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

  // Helper: Seed default tests if database collection is empty
  const seedDefaultTests = async () => {
    try {
      const collRef = collection(db, 'tests');
      const snap = await getDocs(collRef);
      if (snap.empty) {
        console.log('Seeding default tests into server Firestore database...');
        for (const test of DEFAULT_TESTS) {
          await setDoc(doc(db, 'tests', test.id), test);
        }
      }
    } catch (e) {
      console.error('Error seeding default tests:', e);
    }
  };

  // Run seed
  await seedDefaultTests();

  // API Endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", firebaseProjectId: firebaseConfig.projectId });
  });

  // 1. Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const docRef = doc(db, 'settings', 'tutor');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        res.json(docSnap.data());
      } else {
        res.json({ isConfigured: false });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const docRef = doc(db, 'settings', 'tutor');
      await setDoc(docRef, req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Students
  app.get("/api/students", async (req, res) => {
    try {
      const collRef = collection(db, 'students');
      const q = query(collRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const students: any[] = [];
      querySnapshot.forEach((doc) => {
        students.push({ id: doc.id, ...doc.data() });
      });
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const docRef = doc(db, 'students', req.params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        res.json({ id: docSnap.id, ...docSnap.data() });
      } else {
        res.status(404).json({ error: "Student not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const { id, name, createdAt } = req.body;
      const docRef = doc(db, 'students', id);
      await setDoc(docRef, { name, createdAt });
      res.json({ id, name, createdAt });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      const studentId = req.params.id;
      await deleteDoc(doc(db, 'students', studentId));
      
      // Cascading delete student tests
      const collRef = collection(db, 'student_tests');
      const q = query(collRef, where('studentId', '==', studentId));
      const querySnapshot = await getDocs(q);
      const promises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(promises);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Tests Template Library
  app.get("/api/tests", async (req, res) => {
    try {
      const collRef = collection(db, 'tests');
      const q = query(collRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const tests: any[] = [];
      querySnapshot.forEach((doc) => {
        tests.push({ id: doc.id, ...doc.data() });
      });
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tests", async (req, res) => {
    try {
      const { id, title, description, systemType, questions, createdAt } = req.body;
      const docRef = doc(db, 'tests', id);
      await setDoc(docRef, { title, description, systemType, questions, createdAt });
      res.json({ id, title, description, systemType, questions, createdAt });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tests/:id", async (req, res) => {
    try {
      await deleteDoc(doc(db, 'tests', req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Student Assigned Tests
  app.get("/api/student-tests/:studentId", async (req, res) => {
    try {
      const studentId = req.params.studentId;
      const collRef = collection(db, 'student_tests');
      const q = query(collRef, where('studentId', '==', studentId));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/student-tests", async (req, res) => {
    try {
      const testData = req.body;
      const docRef = doc(db, 'student_tests', testData.id);
      await setDoc(docRef, testData);
      res.json(testData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/student-tests/:id", async (req, res) => {
    try {
      await deleteDoc(doc(db, 'student_tests', req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/student-tests/:id/submit", async (req, res) => {
    try {
      const { answers, doubtedQuestions, timeSpent, tabSwitches, results, completedAt } = req.body;
      const docRef = doc(db, 'student_tests', req.params.id);
      await updateDoc(docRef, {
        status: 'completed',
        completedAt,
        answers,
        doubtedQuestions,
        timeSpent,
        tabSwitches,
        results
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite Dev Server Middleware or Production Static Serve
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
