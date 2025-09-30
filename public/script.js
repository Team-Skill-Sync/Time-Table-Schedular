async function loadTimetable(){
    const res = await fetch("/principal/timetable");
    const data = await res.json();
    const container = document.getElementById("timetable");
    if(data && data.weekly){
        // Build HTML table
        let table = `<table class="table-auto border-collapse border border-gray-400 w-full">
        <thead>
          <tr class="bg-gray-200">
            <th class="border px-4 py-2">Period</th>
            ${Object.keys(data.weekly).map(day=>`<th class="border px-4 py-2">${day}</th>`).join("")}
          </tr>
        </thead>
        <tbody>`;
        for(let i=0;i<6;i++){ // 6 periods
            table += `<tr>`;
            table += `<td class="border px-4 py-2 font-bold">Period ${i+1}</td>`;
            Object.keys(data.weekly).forEach(day=>{
                table += `<td class="border px-4 py-2">${data.weekly[day][i]}</td>`;
            });
            table += `</tr>`;
        }
        table += `</tbody></table>`;
        container.innerHTML = table;
    } else {
        container.innerHTML = "<p>No timetable generated yet.</p>";
    }
}
