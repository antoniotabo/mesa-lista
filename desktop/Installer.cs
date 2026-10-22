using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;
[assembly: AssemblyTitle("Instalar Mesa Lista")]
[assembly: AssemblyVersion("3.2.0.0")]
static class Setup {
 [STAThread] static void Main(){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);if(!Environment.Is64BitOperatingSystem){MessageBox.Show("Esta entrega requiere Windows de 64 bits.","Mesa Lista");return;}Application.Run(new InstallForm());}
}
class InstallForm : Form {
 readonly Button install;readonly Label status;readonly CheckBox open;readonly string home,program;bool installed;
 public InstallForm(){home=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"MesaLista");program=Path.Combine(home,"programa");Text="Instalar Mesa Lista 3.2";ClientSize=new Size(560,360);StartPosition=FormStartPosition.CenterScreen;FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;Font=new Font("Segoe UI",10);BackColor=Color.FromArgb(248,246,241);
  var heading=new Label(){Text="Mesa Lista para tu restaurante",Location=new Point(24,22),Size=new Size(510,34),Font=new Font("Segoe UI",17,FontStyle.Bold)};Controls.Add(heading);
  var body=new Label(){Text="Instala el servidor en la PC principal. Los celulares entran desde el navegador por la misma red Wi-Fi.\n\nIncluye Node.js. No necesitas Visual Studio ni descargar dependencias.\n\nWindows 10/11 de 64 bits. Se instalará para este usuario en:\n"+program,Location=new Point(24,72),Size=new Size(510,153)};Controls.Add(body);
  open=new CheckBox(){Text="Abrir Mesa Lista al terminar",Checked=true,Location=new Point(24,235),Size=new Size(400,28)};Controls.Add(open);
  status=new Label(){Text="Los datos existentes se conservan. Cierra Mesa Lista antes de actualizar.",Location=new Point(24,270),Size=new Size(510,38)};Controls.Add(status);
  install=new Button(){Text="Instalar",Location=new Point(355,310),Size=new Size(180,36),BackColor=Color.FromArgb(163,63,40),ForeColor=Color.White,FlatStyle=FlatStyle.Flat};install.Click+=async(s,e)=>await Install();Controls.Add(install);
 }
 async Task Install(){if(installed){Close();return;}install.Enabled=false;open.Enabled=false;ControlBox=false;status.Text="Instalando programa y acceso directo…";try{await Task.Run(()=>Extract());CreateShortcut();status.Text="Instalación terminada. Datos: "+Path.Combine(home,"datos");if(open.Checked)Process.Start(new ProcessStartInfo(Path.Combine(program,"Mesa Lista.exe")){UseShellExecute=true});installed=true;install.Text="Cerrar";install.Enabled=true;}catch(Exception ex){MessageBox.Show("No se pudo instalar. Cierra el servidor desde su icono junto al reloj y vuelve a intentar.\n\n"+ex.Message,"Mesa Lista",MessageBoxButtons.OK,MessageBoxIcon.Error);status.Text="Instalación pendiente. Tus datos no se han reemplazado.";install.Enabled=true;open.Enabled=true;}finally{ControlBox=true;}}
 void Extract(){Directory.CreateDirectory(program);Directory.CreateDirectory(Path.Combine(home,"datos"));using(var guard=new FileStream(Path.Combine(program,"servidor.lock"),FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None))using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("MesaLista.Payload"))using(var zip=new ZipArchive(stream,ZipArchiveMode.Read)){
  string safeRoot=Path.GetFullPath(program)+Path.DirectorySeparatorChar;
  foreach(var entry in zip.Entries){string relative=entry.FullName.Replace('/',Path.DirectorySeparatorChar);string target=Path.GetFullPath(Path.Combine(program,relative));if(!target.StartsWith(safeRoot,StringComparison.OrdinalIgnoreCase))throw new IOException("Ruta inválida en el paquete.");if(String.IsNullOrEmpty(entry.Name)){Directory.CreateDirectory(target);continue;}if(relative.Equals("config-servidor.json",StringComparison.OrdinalIgnoreCase)&&File.Exists(target))continue;Directory.CreateDirectory(Path.GetDirectoryName(target));using(var input=entry.Open())using(var output=new FileStream(target,FileMode.Create,FileAccess.Write))input.CopyTo(output);}
 }}
 void CreateShortcut(){string desktop=Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),menu=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),"Mesa Lista");Directory.CreateDirectory(menu);MakeLink(Path.Combine(desktop,"Mesa Lista.lnk"));MakeLink(Path.Combine(menu,"Mesa Lista.lnk"));}
 void MakeLink(string file){dynamic shell=Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));dynamic link=shell.CreateShortcut(file);link.TargetPath=Path.Combine(program,"Mesa Lista.exe");link.WorkingDirectory=program;link.Description="Abrir Mesa Lista y su servidor local";link.IconLocation=Path.Combine(program,"Mesa Lista.exe")+",0";link.Save();System.Runtime.InteropServices.Marshal.FinalReleaseComObject(link);System.Runtime.InteropServices.Marshal.FinalReleaseComObject(shell);}
}
