// import { useState } from "react";

// export default function Login({ onLoginSuccess }) {
//   const [id, setId] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   async function handleLogin(e) {
//     e.preventDefault();
//     setLoading(true);
//     setError("");

//     try {
//       const res = await fetch(
//         "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/login",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ userid: id, password }),
//         }
//       );

//       const data = await res.json();

//       if (!res.ok) {
//         setError(data.message || "Invalid credentials");
//         return;
//       }

//       // Save token (optional)
//      localStorage.setItem("adminToken", data.token);


//       // After login success
//       onLoginSuccess();
//     } catch (err) {
//       setError("Something went wrong");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="flex justify-center items-center min-h-screen bg-[#0d1117]">
//       <form
//         onSubmit={handleLogin}
//         className="bg-[#161b22] p-10 rounded-xl w-[420px] border border-gray-700 shadow-xl"
//       >
//         <h2 className="text-center text-2xl font-semibold mb-10 text-gray-200">
//           Enter the following details
//         </h2>

//         <div className="mb-6">
//           <label className="block text-gray-400 mb-1">Id</label>
//           <input
//             value={id}
//             onChange={(e) => setId(e.target.value)}
//             type="text"
//             className="w-full bg-transparent border-b border-gray-600 outline-none py-2 text-gray-200"
//           />
//         </div>

//         <div className="mb-6">
//           <label className="block text-gray-400 mb-1">Password</label>
//           <input
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             type="password"
//             className="w-full bg-transparent border-b border-gray-600 outline-none py-2 text-gray-200"
//           />
//         </div>

//         {error && (
//           <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
//         )}

//         <button
//           disabled={loading}
//           className="w-full mt-4 bg-[#1f6feb] hover:bg-[#1158c7] transition text-white py-2 rounded-full flex justify-center items-center gap-2"
//         >
//           {loading ? "Logging in..." : "Login"}
//         </button>
//       </form>
//     </div>
//   );
// }


import { useState } from "react";

export default function Login({ onLoginSuccess }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userid: id, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        return;
      }

      // ✅ Save token
      localStorage.setItem("adminToken", data.token);

      // ⭐⭐⭐ SAVE USER DETAILS IN LOCAL STORAGE ⭐⭐⭐
      localStorage.setItem("adminUser", JSON.stringify(data.admin));

      // After login success
      onLoginSuccess();
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#0d1117]">
      <form
        onSubmit={handleLogin}
        className="bg-[#161b22] p-10 rounded-xl w-[420px] border border-gray-700 shadow-xl"
      >
        <h2 className="text-center text-2xl font-semibold mb-10 text-gray-200">
          Enter the following details
        </h2>

        <div className="mb-6">
          <label className="block text-gray-400 mb-1">Id</label>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            type="text"
            className="w-full bg-transparent border-b border-gray-600 outline-none py-2 text-gray-200"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-400 mb-1">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="w-full bg-transparent border-b border-gray-600 outline-none py-2 text-gray-200"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          disabled={loading}
          className="w-full mt-4 bg-[#1f6feb] hover:bg-[#1158c7] transition text-white py-2 rounded-full flex justify-center items-center gap-2"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
