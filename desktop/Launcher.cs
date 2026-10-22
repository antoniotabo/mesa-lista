using System;
using System.IO;
using System.Net;
using System.Text;
using System.Diagnostics;
using System.Drawing;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using System.Collections.Generic;
using System.Reflection;
[assembly: AssemblyTitle("Mesa Lista")]
[assembly: AssemblyVersion("3.2.0.0")]
static class Launcher {
 [STAThread] static void Main(){
  Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
  string root=AppDomain.CurrentDomain.BaseDirectory;string identity;
  using(var sha=System.Security.Cryptography.SHA256.Create())identity=BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(root.ToLowerInvariant()))).Replace("-","").Substring(0,16);
  bool created;using(var mutex=new Mutex(true,"Local\\MesaLista-"+identity,out created)){
   if(!created){try{using(var signal=EventWaitHandle.OpenExisting("Local\\MesaLista-Abrir-"+identity))signal.Set();}catch{MessageBox.Show("Mesa Lista ya se está iniciando. Espera unos segundos.","Mesa Lista");}return;}
   try{using(var context=new ServerContext(root,identity))Application.Run(context);}catch(Exception ex){MessageBox.Show(ex.Message,"No se pudo abrir Mesa Lista",MessageBoxButtons.OK,MessageBoxIcon.Error);}finally{mutex.ReleaseMutex();}
  }
 }
}
class ServerContext : ApplicationContext {
 readonly string root,data,url;readonly NotifyIcon tray;readonly EventWaitHandle openSignal;readonly System.Windows.Forms.Timer timer;
 readonly FileStream installationLock;Process server;StreamWriter log;bool ready,closing,startupNotice;DateTime began;
 public ServerContext(string folder,string identity){
  root=folder;data=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"MesaLista","datos");Directory.CreateDirectory(data);
  installationLock=new FileStream(Path.Combine(root,"servidor.lock"),FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None);
  int port=3000;string config=Path.Combine(root,"config-servidor.json");
  if(File.Exists(config)){var parsed=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(config));if(parsed.ContainsKey("puerto"))port=Convert.ToInt32(parsed["puerto"]);}
  string environmentPort=Environment.GetEnvironmentVariable("PORT");if(!String.IsNullOrEmpty(environmentPort))port=Int32.Parse(environmentPort);
  if(port<1||port>65535)throw new Exception("El puerto debe estar entre 1 y 65535. Revisa config-servidor.json.");
  url="http://localhost:"+port+"/";
  Directory.CreateDirectory(Path.Combine(data,"registros"));log=new StreamWriter(Path.Combine(data,"registros","escritorio-"+DateTime.Now.ToString("yyyy-MM-dd")+".log"),true,Encoding.UTF8);log.AutoFlush=true;
  openSignal=new EventWaitHandle(false,EventResetMode.AutoReset,"Local\\MesaLista-Abrir-"+identity);
  tray=new NotifyIcon();tray.Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);tray.Text="Mesa Lista · iniciando servidor";tray.Visible=true;
  var menu=new ContextMenuStrip();menu.Items.Add("Abrir Mesa Lista",null,(s,e)=>Open());menu.Items.Add("Abrir carpeta de datos",null,(s,e)=>Process.Start(new ProcessStartInfo(data){UseShellExecute=true}));menu.Items.Add(new ToolStripSeparator());menu.Items.Add("Cerrar servidor",null,async(s,e)=>await Stop());tray.ContextMenuStrip=menu;tray.DoubleClick+=(s,e)=>Open();
  var start=new ProcessStartInfo(Path.Combine(root,"runtime","node.exe"),"\""+Path.Combine(root,"server.js")+"\"");start.WorkingDirectory=root;start.UseShellExecute=false;start.CreateNoWindow=true;start.RedirectStandardInput=true;start.RedirectStandardOutput=true;start.RedirectStandardError=true;
  start.EnvironmentVariables["DATA_DIR"]=data;start.EnvironmentVariables["MESA_DESKTOP"]="1";
  // El acceso directo sirve la red local por HTTP; el arranque manual permite TLS avanzado.
  start.EnvironmentVariables.Remove("TLS_CERT_FILE");start.EnvironmentVariables.Remove("TLS_KEY_FILE");
  server=new Process();server.StartInfo=start;server.OutputDataReceived+=(s,e)=>WriteLog(e.Data);server.ErrorDataReceived+=(s,e)=>WriteLog(e.Data);
  server.Start();server.BeginOutputReadLine();server.BeginErrorReadLine();began=DateTime.UtcNow;
  timer=new System.Windows.Forms.Timer();timer.Interval=700;timer.Tick+=async(s,e)=>await Tick();timer.Start();
 }
 void WriteLog(string text){if(text==null)return;lock(log){log.WriteLine(text);}}
 void Open(){if(ready)Process.Start(new ProcessStartInfo(url){UseShellExecute=true});else tray.ShowBalloonTip(3000,"Mesa Lista","El servidor se está iniciando.",ToolTipIcon.Info);}
 bool IsReady(){try{var request=(HttpWebRequest)WebRequest.Create(url+"api/session");request.Proxy=null;request.Timeout=1000;request.AllowAutoRedirect=false;using(var response=(HttpWebResponse)request.GetResponse())return response.StatusCode==HttpStatusCode.OK&&response.Headers["X-Mesa-Lista"]=="server";}catch{return false;}}
 async Task Tick(){
  if(closing)return;timer.Stop();
  if(server.HasExited){MessageBox.Show("El servidor se cerró. Si el puerto está ocupado, cambia config-servidor.json. Revisa los registros en:\n"+Path.Combine(data,"registros"),"Mesa Lista",MessageBoxButtons.OK,MessageBoxIcon.Warning);ExitThread();return;}
  if(!ready){ready=await Task.Run(()=>IsReady());if(ready&&!server.HasExited){tray.Text="Mesa Lista · servidor en funcionamiento";Open();tray.ShowBalloonTip(5000,"Mesa Lista","El servidor sigue activo al cerrar el navegador. Usa este icono para cerrarlo.",ToolTipIcon.Info);}else if(!startupNotice&&(DateTime.UtcNow-began).TotalSeconds>60){startupNotice=true;MessageBox.Show("El servidor todavía no responde. Revisa los registros y el puerto configurado. Puedes cerrarlo desde el icono de Mesa Lista junto al reloj.","Mesa Lista");}}
  if(openSignal.WaitOne(0))Open();if(!closing)timer.Start();
 }
 async Task Stop(){if(closing)return;if(MessageBox.Show("¿Cerrar el servidor? Los celulares se desconectarán hasta que vuelvas a abrir Mesa Lista.","Mesa Lista",MessageBoxButtons.YesNo,MessageBoxIcon.Question)!=DialogResult.Yes)return;closing=true;timer.Stop();tray.Text="Mesa Lista · cerrando";try{if(!server.HasExited){server.StandardInput.WriteLine("mesa-lista:shutdown");server.StandardInput.Flush();bool exited=await Task.Run(()=>server.WaitForExit(25000));if(!exited){closing=false;timer.Start();MessageBox.Show("El servidor sigue cerrando envíos o respaldos. Espera y vuelve a cerrar desde este icono.","Mesa Lista");return;}}ExitThread();}catch(Exception e){closing=false;timer.Start();MessageBox.Show(e.Message,"Mesa Lista");}}
 protected override void Dispose(bool disposing){if(disposing){if(timer!=null)timer.Dispose();if(tray!=null){tray.Visible=false;tray.Dispose();}if(server!=null){try{if(!server.HasExited)server.StandardInput.Close();}catch{}server.Dispose();}if(openSignal!=null)openSignal.Dispose();if(installationLock!=null)installationLock.Dispose();/* Los eventos de salida pueden seguir terminando al desconectar el proceso. */}base.Dispose(disposing);}
}
