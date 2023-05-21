await getDocs(query(collection(db, "rawdata"), orderBy("time", "desc")), where("time", ">=", last));
